import { bewaar, database, lees, vers } from "@/lib/db";
import { callOrbitTool } from "./client";

/** Eén taak in Orbit waarop uren geschreven worden. Uren in minuten. */
export type Schrijfregel = {
  naam: string;
  afgesloten: boolean;
  /** Wat er nu in Orbit op de taak staat; aanpasbaar, dus niet per se wat er verkocht is. */
  beschikbaar: number;
  geschreven: number;
};

/** Een map (hoofdstuk) zoals GetProject die teruggeeft: alleen de onderste laag. */
export type BudgetMap = { id: string; naam: string; regels: Schrijfregel[] };

/** Verkochte uren uit de akkoord gegeven offertes die aan het project hangen. */
export type Offerte =
  { status: "ok"; minuten: number } | { status: "geen" } | { status: "fout" };

/** Uren in minuten. */
export type ProjectBudget = {
  beschikbaar: number;
  geschreven: number;
  offerte: Offerte;
  mappen: BudgetMap[];
};

export type ProjectBudgetResult =
  | { status: "ok"; data: ProjectBudget }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

/** "31h 30m", "12h" of "0m" naar minuten. */
export function parseDuur(text: string): number {
  const uren = /(\d+)h/.exec(text)?.[1] ?? "0";
  const minuten = /(\d+)m/.exec(text)?.[1] ?? "0";
  return Number(uren) * 60 + Number(minuten);
}

const MAP_REGEL = /^\*\*(.+?)\*\*\s+\[chapter api_id: (\w+)\]/;
const TAAK_REGEL =
  /^- (.+?)\s+\[api_id: \w+\](.*?)planned ([\dhm ]+), done ([\dhm ]+)/;

/** Mappen en taken uit GetProject; een map die vaker voorkomt, wordt samengevoegd. */
export function parseMappen(text: string): BudgetMap[] {
  const mappen: BudgetMap[] = [];
  let huidig: BudgetMap | null = null;
  for (const line of text.split("\n")) {
    const map = MAP_REGEL.exec(line);
    if (map) {
      huidig = mappen.find((item) => item.id === map[2]) ?? null;
      if (!huidig) {
        huidig = { id: map[2], naam: map[1], regels: [] };
        mappen.push(huidig);
      }
      continue;
    }
    const taak = TAAK_REGEL.exec(line);
    if (!taak) continue;
    if (!huidig) {
      huidig = { id: "", naam: "Zonder map", regels: [] };
      mappen.push(huidig);
    }
    huidig.regels.push({
      naam: taak[1],
      afgesloten: taak[2].includes("(closed)"),
      beschikbaar: parseDuur(taak[3]),
      geschreven: parseDuur(taak[4]),
    });
  }
  return mappen;
}

/** Uren en mappen uit de tekst van GetProject; de offerte komt er later bij. */
export function parseProjectUren(
  project: string,
): Omit<ProjectBudget, "offerte"> {
  const workload = /\*\*Workload:\*\*.*?done (\d+)m \/ total (\d+)m/.exec(
    project,
  );
  return {
    beschikbaar: Number(workload?.[2] ?? 0),
    geschreven: Number(workload?.[1] ?? 0),
    mappen: parseMappen(project),
  };
}

/** De api_id's van de offertes onder "Links" in GetProject. */
export function parseOfferIds(project: string): string[] {
  return [...project.matchAll(/^- Offer .*\[api_id: (\w+)\]/gm)].map(
    (match) => match[1],
  );
}

/** De actieve versie uit GetOffer, alleen als de klant die akkoord gaf. */
export function parseActieveVersie(offer: string): string | null {
  if (/^State: (\w+)/m.exec(offer)?.[1] !== "OK") return null;
  return /^ACTIVE_VERSION api_id: (\w+)/m.exec(offer)?.[1] ?? null;
}

type OfferItem = { type?: unknown; workload?: unknown; items?: unknown };

function somWerk(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((totaal: number, item: unknown) => {
    if (typeof item !== "object" || item === null) return totaal;
    const { type, workload, items: kinderen } = item as OfferItem;
    const werk = type === "WORK" && typeof workload === "number" ? workload : 0;
    return totaal + werk + somWerk(kinderen);
  }, 0);
}

/** Verkochte minuten uit het JSON-blok van GetOfferVersion. */
export function parseOfferteMinuten(version: string): number | null {
  // Orbit gebruikt \r\n als regeleinde.
  const json = /```json\s*([\s\S]*?)```/.exec(version)?.[1];
  if (!json) return null;
  try {
    return somWerk(JSON.parse(json));
  } catch {
    return null;
  }
}

/** De offerte-uren als die er zijn, anders wat er in Orbit beschikbaar staat. */
export function plafond(data: ProjectBudget): {
  minuten: number;
  soort: "offerte" | "beschikbaar";
} {
  if (data.offerte.status === "ok" && data.offerte.minuten > 0) {
    return { minuten: data.offerte.minuten, soort: "offerte" };
  }
  return { minuten: data.beschikbaar, soort: "beschikbaar" };
}

const CACHE_MS = 15 * 60 * 1000;
// Een akkoord gegeven offerte verandert zelden; zo blijven we onder de rate limit van Orbit.
const OFFERTE_CACHE_MS = 24 * 60 * 60 * 1000;

/** Alles verloopt meteen, maar blijft bewaard als terugval. */
export function clearBudgetCache(): void {
  database().prepare("UPDATE orbit_cache SET opgehaald = 0").run();
}

/** Budget en uren van één project, met een cache van 15 minuten per gebruiker. */
export async function fetchProjectBudget(
  email: string,
  number: string,
): Promise<ProjectBudgetResult> {
  const sleutel = `budget:v1:${email}:${number}`;
  const hit = lees<ProjectBudget>(sleutel);
  if (hit && vers(hit.opgehaald, CACHE_MS)) {
    return { status: "ok", data: hit.waarde };
  }

  const result = rij.then(() => fetchUncached(email, number));
  rij = result.catch(() => undefined);
  const nieuw = await result;
  if (nieuw.status === "ok") {
    // Zonder offerte-uren meteen verlopen, zodat de volgende keer de offerte opnieuw wordt geprobeerd.
    bewaar(
      sleutel,
      nieuw.data,
      nieuw.data.offerte.status === "fout" ? 0 : undefined,
    );
    return nieuw;
  }
  return hit ? { status: "ok", data: hit.waarde } : nieuw;
}

// ponytail: Orbit remt af bij veel aanroepen tegelijk, dus één project tegelijk; een pool als dat te traag wordt.
let rij: Promise<unknown> = Promise.resolve();

async function fetchUncached(
  email: string,
  number: string,
): Promise<ProjectBudgetResult> {
  const project = await callOrbitTool(email, "GetProject", {
    projectId: number,
  });
  if (project.status !== "ok") return project;
  return {
    status: "ok",
    data: {
      ...parseProjectUren(project.text),
      offerte: await fetchOfferte(email, parseOfferIds(project.text)),
    },
  };
}

/** Verkochte minuten van één offerte, of null als die niet akkoord is. */
async function fetchOfferteMinuten(
  email: string,
  offerId: string,
): Promise<number | null | "fout"> {
  const sleutel = `offerte:v1:${email}:${offerId}`;
  const hit = lees<number | null>(sleutel);
  if (hit && vers(hit.opgehaald, OFFERTE_CACHE_MS)) return hit.waarde;

  const offer = await callOrbitTool(email, "GetOffer", { offerId });
  if (offer.status !== "ok") return hit ? hit.waarde : "fout";
  const versie = parseActieveVersie(offer.text);
  const version = versie
    ? await callOrbitTool(email, "GetOfferVersion", {
        offerVersionId: versie,
      })
    : null;
  if (version && version.status !== "ok") return hit ? hit.waarde : "fout";
  const minuten = version ? parseOfferteMinuten(version.text) : null;
  bewaar(sleutel, minuten);
  return minuten;
}

async function fetchOfferte(
  email: string,
  offerIds: string[],
): Promise<Offerte> {
  const uitkomsten: (number | null | "fout")[] = [];
  for (const offerId of offerIds) {
    uitkomsten.push(await fetchOfferteMinuten(email, offerId));
  }
  if (uitkomsten.includes("fout")) return { status: "fout" };
  const minuten = uitkomsten.filter(
    (uitkomst): uitkomst is number => typeof uitkomst === "number",
  );
  if (minuten.length === 0) return { status: "geen" };
  return {
    status: "ok",
    minuten: minuten.reduce((totaal, item) => totaal + item, 0),
  };
}
