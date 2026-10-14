import { bewaar, lees, vers } from "@/lib/db";
import { opAchtergrond } from "./achtergrond";
import { callOrbitTool } from "./client";

export const PROJECT_STATES = ["DRAFT", "OPEN", "CLOSED", "ARCHIVED"] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];

export type OrbitProject = {
  /** Het interne id van Orbit. */
  id: string;
  /** Het projectnummer dat je in Orbit ziet, bijvoorbeeld "1607". */
  number: string;
  name: string;
  client: string;
  /** De projectverantwoordelijke. */
  owner: string;
  state: ProjectState;
  endDate: string | null;
};

function parseState(value: string): ProjectState | null {
  return PROJECT_STATES.find((state) => state === value) ?? null;
}

/**
 * Parst één tabelregel uit ListProjects, bijvoorbeeld:
 * | 1607 | Naam | Klant | Eigenaar | OPEN | OFFER | 191,970.00 | ... | 2026-12-31 |
 * Oudere antwoorden hadden een link als nummer: [1607](jump:PROJECT:862777).
 * Regels die niet kloppen worden overgeslagen.
 */
function parseRow(line: string, id: string): OrbitProject | null {
  const cells = line
    .replace(/^\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .split(/\s*\|\s*/);
  if (cells.length < 10) return null;

  const number = /^\[?(\d+)\]?/.exec(cells[0])?.[1];
  const state = parseState(cells[4]);
  if (!number || !state) return null;

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(cells[9]) ? cells[9] : null;
  return {
    id,
    number,
    name: cells[1],
    client: cells[2] || "Onbekende klant",
    owner: cells[3],
    state,
    endDate,
  };
}

/** Tabelregels met een projectnummer in de eerste kolom. */
const PROJECT_REGEL = /^\| \[?\d+/;

/** Parst de Markdown-tabel die ListProjects teruggeeft; de id's staan op de regel api_ids. */
export function parseProjectList(text: string): OrbitProject[] {
  const ids = /^api_ids: (.+)$/m.exec(text)?.[1].split(/,\s*/) ?? [];
  return text
    .split("\n")
    .filter((line) => PROJECT_REGEL.test(line))
    .map((line, index) => parseRow(line, ids[index] ?? ""))
    .filter((project): project is OrbitProject => project !== null);
}

export type ProjectListResult =
  | { status: "ok"; projects: OrbitProject[]; fetchedAt: Date }
  | { status: "niet-verbonden" }
  | { status: "fout"; message: string };

const CACHE_MS = 15 * 60 * 1000;
const PAGE_SIZE = 100;

/** Welke projecten: die van mij, of die in een Orbit-projectmap. */
export type ProjectFilter = { mine: true } | { folderId: string };

const sleutelVan = (email: string, filter: ProjectFilter) =>
  `projecten:v1:${JSON.stringify([email, filter])}`;

// ponytail: Verversen geldt tot een herstart; daarna telt alleen de leeftijd van de bewaarde lijst.
let geldigVanaf = 0;

/** Alles verloopt meteen, zodat de volgende keer op Orbit wordt gewacht; blijft bewaard als terugval. */
export function clearProjectCache(): void {
  geldigVanaf = Date.now();
}

/** Alle pagina's van ListProjects, tot een pagina niet meer vol is. */
async function fetchAllPages(
  email: string,
  filter: ProjectFilter,
): Promise<ProjectListResult> {
  const projects: OrbitProject[] = [];
  for (let page = 1; ; page++) {
    const result = await callOrbitTool(email, "ListProjects", {
      ...filter,
      states: "OPEN",
      pageSize: PAGE_SIZE,
      page,
    });
    if (result.status !== "ok") return result;

    const pageProjects = parseProjectList(result.text);
    if (pageProjects.length === 0 && result.text.includes("api_ids:")) {
      return {
        status: "fout",
        message: "De projectlijst van Orbit heeft een onbekend formaat.",
      };
    }
    projects.push(...pageProjects);
    if (pageProjects.length < PAGE_SIZE) break;
  }
  return { status: "ok", projects, fetchedAt: new Date() };
}

/**
 * Open projecten volgens het filter, met een cache van 15 minuten per gebruiker.
 * Is de lijst alleen oud, dan meteen de bewaarde lijst en op de achtergrond verversen;
 * na Verversen of zonder lijst wachten op Orbit. Bij een fout de vorige lijst.
 */
export async function fetchProjects(
  email: string,
  filter: ProjectFilter,
): Promise<ProjectListResult> {
  const sleutel = sleutelVan(email, filter);
  const hit = lees<OrbitProject[]>(sleutel);
  const bewaard = hit && {
    status: "ok" as const,
    projects: hit.waarde,
    fetchedAt: new Date(hit.opgehaald),
  };
  if (bewaard && hit.opgehaald >= geldigVanaf) {
    if (!vers(hit.opgehaald, CACHE_MS)) {
      opAchtergrond(sleutel, () => haalOp(email, filter));
    }
    return bewaard;
  }

  const result = await haalOp(email, filter);
  if (result.status === "fout" && bewaard) return bewaard;
  return result;
}

async function haalOp(
  email: string,
  filter: ProjectFilter,
): Promise<ProjectListResult> {
  const result = await fetchAllPages(email, filter);
  if (result.status === "ok") {
    bewaar(
      sleutelVan(email, filter),
      result.projects,
      result.fetchedAt.getTime(),
    );
  }
  return result;
}
