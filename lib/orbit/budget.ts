import { bewaar, database, lees, vers } from "@/lib/db";
import { DEMO, demoBudget } from "@/lib/demo";
import { opAchtergrond } from "./achtergrond";
import { callOrbitTool } from "./client";
import { parseProjectUren, type BudgetMap } from "./budget-tekst";

export type { Schrijfregel, BudgetMap } from "./budget-tekst";

/** Verkochte uren uit de akkoord gegeven offertes die aan het project hangen. */
export type Offerte =
  { status: "ok"; minuten: number } | { status: "geen" } | { status: "fout" };

/** Uren in minuten. */
export type ProjectBudget = {
  beschikbaar: number;
  geschreven: number;
  offerte: Offerte;
  mappen: BudgetMap[];
  /** Startdatum van het project als "2026-01-01"; null als Orbit er geen heeft. */
  start: string | null;
};

export type ProjectBudgetResult =
  | { status: "ok"; data: ProjectBudget }
  | { status: "laden" }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

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

// Na een mislukte poging even niet opnieuw, zodat de achtergrond niet blijft draaien.
const FOUT_MS = 5 * 60 * 1000;
const fouten = new Map<string, number>();

/**
 * Budget en uren van één project, met een cache van 15 minuten per gebruiker.
 * Wat ontbreekt of verlopen is, wordt op de achtergrond opgehaald; tot dan de
 * bewaarde cijfers, of "laden".
 */
export function fetchProjectBudget(
  email: string,
  number: string,
): ProjectBudgetResult {
  if (DEMO) {
    const data = demoBudget(number);
    return data
      ? { status: "ok", data }
      : { status: "fout", message: "Onbekend demoproject." };
  }
  const sleutel = `budget:v4:${email}:${number}`;
  const hit = lees<ProjectBudget>(sleutel);
  if (hit && vers(hit.opgehaald, CACHE_MS)) {
    return { status: "ok", data: hit.waarde };
  }
  const mislukt = fouten.get(sleutel);
  if (mislukt && vers(mislukt, FOUT_MS)) {
    return hit
      ? { status: "ok", data: hit.waarde }
      : {
          status: "fout",
          message: "Het budget kon niet worden opgehaald uit Orbit.",
        };
  }

  opAchtergrond(sleutel, async () => {
    const nieuw = await fetchUncached(email, number);
    if (nieuw.status !== "ok") {
      fouten.set(sleutel, Date.now());
      return;
    }
    fouten.delete(sleutel);
    // Zonder offerte-uren meteen verlopen, zodat de volgende keer de offerte opnieuw wordt geprobeerd.
    bewaar(
      sleutel,
      nieuw.data,
      nieuw.data.offerte.status === "fout" ? 0 : undefined,
    );
  });
  return hit ? { status: "ok", data: hit.waarde } : { status: "laden" };
}

async function fetchUncached(
  email: string,
  number: string,
): Promise<ProjectBudgetResult> {
  const project = await callOrbitTool(
    email,
    "GetProject",
    { projectId: number },
    true,
  );
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

  const offer = await callOrbitTool(email, "GetOffer", { offerId }, true);
  if (offer.status !== "ok") return hit ? hit.waarde : "fout";
  const versie = parseActieveVersie(offer.text);
  const version = versie
    ? await callOrbitTool(
        email,
        "GetOfferVersion",
        { offerVersionId: versie },
        true,
      )
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
