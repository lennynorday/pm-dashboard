import type {
  AccountGegevens,
  AlleAccountGegevens,
  Contactpersoon,
} from "./accountgegevens";
import { LINK_TYPES, LinkType, LinkUrls } from "./links";

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
  naam: "c-PhQ1GgAOiW",
  am: "c-MegEx3kHVZ",
  jiraKeys: "c-tUsRlLHmYz",
  supportOrganizations: "c-4-fKHAXd6d",
  contactpersonen: "c-zYeBW-ImGY",
} as const;

const LINK_KOLOM: Record<LinkType, string> = {
  "superhuman-intern": "c-LPOGYQlSE5",
  "superhuman-gedeeld": "c-fA7PCRVDWX",
  "slack-intern": "c--H27m0-DDg",
  "slack-klant": "c-0NIx0b5Jlb",
  "jira-board": "c-bWOcV9NxJl",
  drive: "c-19LH-bHx2g",
  offerte: "c-W1cvzHrhxI",
  "omgeving-acc": "c-Qj6ml7we-K",
  "omgeving-prod": "c-xQA47jnGKo",
  overig: "c-ic7q-uARcr",
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

/** Eén rij; null als er geen Orbit-id in staat. */
function parseRij(data: unknown): [string, AccountGegevens] | null {
  const waarden = record(record(data).values);
  const orbitId = tekst(waarden, KOLOM.orbitId);
  if (!orbitId) return null;
  return [
    orbitId,
    {
      naam: tekst(waarden, KOLOM.naam) || undefined,
      am: tekst(waarden, KOLOM.am) || undefined,
      jiraKeys: lijst(tekst(waarden, KOLOM.jiraKeys)).map((key) =>
        key.toUpperCase(),
      ),
      supportOrganizations: lijst(tekst(waarden, KOLOM.supportOrganizations)),
      contactpersonen: parseContactpersonen(
        tekst(waarden, KOLOM.contactpersonen),
      ),
      links: parseLinks(waarden),
    },
  ];
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
  return Object.fromEntries(rijen.map(parseRij).filter((rij) => rij !== null));
}

/**
 * Voegt de rij van een klant toe of werkt hem bij. Superhuman verwerkt dit
 * na een paar seconden; de app wacht daar niet op.
 */
export async function saveRij(
  orbitId: string,
  klant: string,
  gegevens: AccountGegevens,
): Promise<void> {
  const cellen: [string, string][] = [
    [KOLOM.orbitId, orbitId],
    [KOLOM.klant, klant],
    [KOLOM.naam, gegevens.naam ?? ""],
    [KOLOM.am, gegevens.am ?? ""],
    [KOLOM.jiraKeys, gegevens.jiraKeys.join(", ")],
    [KOLOM.supportOrganizations, gegevens.supportOrganizations.join(", ")],
    [KOLOM.contactpersonen, formatContactpersonen(gegevens.contactpersonen)],
    ...LINK_TYPES.map((type): [string, string] => [
      LINK_KOLOM[type],
      gegevens.links[type] ?? "",
    ]),
  ];
  await request("/rows", {
    method: "POST",
    body: JSON.stringify({
      keyColumns: [KOLOM.orbitId],
      rows: [{ cells: cellen.map(([column, value]) => ({ column, value })) }],
    }),
  });
}
