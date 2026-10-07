import type {
  AlleAccountGegevens,
  Contactpersoon,
  KlantVelden,
  PlatformGegevens,
} from "./accountgegevens";
import {
  formatEigenLinks,
  LINK_TYPES,
  LinkType,
  LinkUrls,
  parseEigenLinks,
} from "./links";

/** De tabel op de pagina Shortcuts in Culture Rotterdam Mission Control. */
const TABEL_URL =
  "https://docs.superhuman.com/apis/v1/docs/G775GfEi_2/tables/grid-aiardDerdh";

/** Wat collega's in Superhuman openen. */
export const TABEL_BROWSER_URL =
  "https://docs.superhuman.com/d/_dG775GfEi_2#_tugrid-aiardDerdh";

/** Kolom-id's in plaats van namen, zodat hernoemen in Superhuman niets breekt. */
const KOLOM = {
  klant: "c-CtxH8Fdj4Y",
  orbitId: "c-CXL6t7por1",
  platform: "c-dT_H3ngZYh",
  orbitProjecten: "c-TmE6og8-9d",
  zonderPlatform: "c-ShmUnihnjP",
  naam: "c-PhQ1GgAOiW",
  am: "c-MegEx3kHVZ",
  jiraKeys: "c-tUsRlLHmYz",
  supportOrganizations: "c-4-fKHAXd6d",
  contactpersonen: "c-zYeBW-ImGY",
  eigenLinks: "c-4PSZpd5BLm",
} as const;

const LINK_KOLOM: Record<LinkType, string> = {
  "superhuman-intern": "c-LPOGYQlSE5",
  "superhuman-gedeeld": "c-fA7PCRVDWX",
  "slack-intern": "c--H27m0-DDg",
  "slack-klant": "c-0NIx0b5Jlb",
  "jira-board": "c-bWOcV9NxJl",
  drive: "c-19LH-bHx2g",
  figma: "c-aAwUPFYIor",
  "omgeving-acc": "c-Qj6ml7we-K",
  "omgeving-prod": "c-xQA47jnGKo",
  "cms-acc": "c-k2JYz6vZS-",
  "cms-prod": "c-eqY6-Oi5ZO",
};

async function request(pad: string, init?: RequestInit): Promise<unknown> {
  const token = process.env.SUPERHUMAN_API_TOKEN;
  if (!token) throw new Error("SUPERHUMAN_API_TOKEN ontbreekt in .env.local.");
  const response = await fetch(`${TABEL_URL}${pad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Superhuman weigert het API-token. Het is ingetrokken, of heeft geen toegang meer tot de tabel.",
    );
  }
  if (!response.ok) {
    throw new Error(`Superhuman gaf een fout (${response.status}).`);
  }
  return response.json();
}

function record(data: unknown): Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function tekst(waarden: Record<string, unknown>, kolom: string): string {
  const waarde = waarden[kolom];
  return typeof waarde === "string" ? waarde.trim() : "";
}

function lijst(waarde: string): string[] {
  return waarde
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Eén per regel: "Naam (rol) e-mail"; rol en e-mail mogen weg. */
export function parseContactpersonen(waarde: string): Contactpersoon[] {
  return waarde
    .split("\n")
    .map((regel) => regel.trim())
    .filter(Boolean)
    .map((regel) => {
      const email = /\S+@\S+$/.exec(regel)?.[0];
      const rest = email ? regel.slice(0, -email.length).trim() : regel;
      const rol = /\(([^)]*)\)$/.exec(rest)?.[1].trim();
      const naam = rest.replace(/\([^)]*\)$/, "").trim();
      return { naam: naam || email || regel, rol: rol || undefined, email };
    });
}

export function formatContactpersonen(personen: Contactpersoon[]): string {
  return personen
    .map(
      (persoon) =>
        persoon.naam +
        (persoon.rol ? ` (${persoon.rol})` : "") +
        (persoon.email ? ` ${persoon.email}` : ""),
    )
    .join("\n");
}

function parseLinks(waarden: Record<string, unknown>): LinkUrls {
  return Object.fromEntries(
    LINK_TYPES.flatMap((type) => {
      const url = /https?:\/\/[^\s)\]]+/.exec(
        tekst(waarden, LINK_KOLOM[type]),
      )?.[0];
      return url && URL.canParse(url) ? [[type, url]] : [];
    }),
  );
}

type Rij = { orbitId: string; klant: KlantVelden; platform: PlatformGegevens };

/** Eén rij; null als er geen Orbit-id in staat. */
function parseRij(data: unknown): Rij | null {
  const rij = record(data);
  const waarden = record(rij.values);
  const orbitId = tekst(waarden, KOLOM.orbitId);
  if (!orbitId) return null;
  return {
    orbitId,
    klant: {
      naam: tekst(waarden, KOLOM.naam) || undefined,
      am: tekst(waarden, KOLOM.am) || undefined,
      zonderPlatform: lijst(tekst(waarden, KOLOM.zonderPlatform)),
    },
    platform: {
      rijId: typeof rij.id === "string" ? rij.id : undefined,
      naam: tekst(waarden, KOLOM.platform),
      orbitProjecten: lijst(tekst(waarden, KOLOM.orbitProjecten)),
      jiraKeys: lijst(tekst(waarden, KOLOM.jiraKeys)).map((key) =>
        key.toUpperCase(),
      ),
      supportOrganizations: lijst(tekst(waarden, KOLOM.supportOrganizations)),
      contactpersonen: parseContactpersonen(
        tekst(waarden, KOLOM.contactpersonen),
      ),
      links: parseLinks(waarden),
      eigenLinks: parseEigenLinks(tekst(waarden, KOLOM.eigenLinks)),
    },
  };
}

/** Rijen per klant; de klantvelden uit de eerste rij die ze heeft. */
export function groepeerRijen(rijen: Rij[]): AlleAccountGegevens {
  return rijen.reduce<AlleAccountGegevens>(
    (alle, { orbitId, klant, platform }) => {
      const vorige = alle[orbitId];
      return {
        ...alle,
        [orbitId]: {
          naam: vorige?.naam ?? klant.naam,
          am: vorige?.am ?? klant.am,
          zonderPlatform: vorige?.zonderPlatform.length
            ? vorige.zonderPlatform
            : klant.zonderPlatform,
          platforms: [...(vorige?.platforms ?? []), platform],
        },
      };
    },
    {},
  );
}

/** Alle rijen van de tabel, per Orbit-klant-id. */
export async function fetchTabel(): Promise<AlleAccountGegevens> {
  const rijen: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ valueFormat: "simple", limit: "500" });
    if (pageToken) params.set("pageToken", pageToken);
    const pagina = record(await request(`/rows?${params}`));
    if (Array.isArray(pagina.items)) rijen.push(...pagina.items);
    pageToken =
      typeof pagina.nextPageToken === "string"
        ? pagina.nextPageToken
        : undefined;
  } while (pageToken);
  return groepeerRijen(rijen.map(parseRij).filter((rij) => rij !== null));
}

type Cel = { column: string; value: string };

function cellen(paren: [string, string][]): Cel[] {
  return paren.map(([column, value]) => ({ column, value }));
}

function klantCellen(orbitId: string, klant: string, velden: KlantVelden) {
  return cellen([
    [KOLOM.orbitId, orbitId],
    [KOLOM.klant, klant],
    [KOLOM.naam, velden.naam ?? ""],
    [KOLOM.am, velden.am ?? ""],
    [KOLOM.zonderPlatform, velden.zonderPlatform.join(", ")],
  ]);
}

/**
 * Werkt één rij bij op zijn id, of voegt hem toe als hij nog geen id heeft.
 * Toevoegen gaat op Orbit-id plus Platform, zodat twee keer opslaan geen
 * twee rijen maakt.
 */
async function schrijfRij(rijId: string | undefined, cells: Cel[]) {
  if (rijId) {
    await request(`/rows/${encodeURIComponent(rijId)}`, {
      method: "PUT",
      body: JSON.stringify({ row: { cells } }),
    });
    return;
  }
  await request("/rows", {
    method: "POST",
    body: JSON.stringify({
      keyColumns: [KOLOM.orbitId, KOLOM.platform],
      rows: [{ cells }],
    }),
  });
}

/**
 * Slaat bij welk platform de projecten van een klant horen: de Orbit-projecten
 * van elk platform, en in alle rijen de projecten zonder platform.
 */
export async function saveKoppelingRijen(
  orbitId: string,
  klant: string,
  velden: KlantVelden,
  platforms: Pick<PlatformGegevens, "rijId" | "naam" | "orbitProjecten">[],
): Promise<void> {
  const klantDeel = klantCellen(orbitId, klant, velden);
  for (const platform of platforms) {
    await schrijfRij(platform.rijId, [
      ...klantDeel,
      ...cellen([
        [KOLOM.platform, platform.naam],
        [KOLOM.orbitProjecten, platform.orbitProjecten.join(", ")],
      ]),
    ]);
  }
}

/**
 * Slaat één platform op, en de klantvelden in alle rijen van die
 * klant. Superhuman verwerkt dit na een paar seconden; de app wacht daar
 * niet op.
 */
export async function savePlatformRij(
  orbitId: string,
  klant: string,
  velden: KlantVelden,
  platform: PlatformGegevens,
  andereRijIds: string[],
): Promise<void> {
  const klantDeel = klantCellen(orbitId, klant, velden);
  await schrijfRij(platform.rijId, [
    ...klantDeel,
    ...cellen([
      [KOLOM.platform, platform.naam],
      [KOLOM.orbitProjecten, platform.orbitProjecten.join(", ")],
      [KOLOM.jiraKeys, platform.jiraKeys.join(", ")],
      [KOLOM.supportOrganizations, platform.supportOrganizations.join(", ")],
      [KOLOM.contactpersonen, formatContactpersonen(platform.contactpersonen)],
      [KOLOM.eigenLinks, formatEigenLinks(platform.eigenLinks)],
      ...LINK_TYPES.map((type): [string, string] => [
        LINK_KOLOM[type],
        platform.links[type] ?? "",
      ]),
    ]),
  ]);
  for (const rijId of andereRijIds) await schrijfRij(rijId, klantDeel);
}
