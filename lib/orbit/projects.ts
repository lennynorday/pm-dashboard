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
 * | [1607](jump:PROJECT:862777) | Naam | Klant | Eigenaar | OPEN | OFFER | 191,970.00 | ... | 2026-12-31 |
 * Regels die niet kloppen worden overgeslagen.
 */
function parseRow(line: string): OrbitProject | null {
  const cells = line
    .replace(/^\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .split(/\s*\|\s*/);
  if (cells.length < 10) return null;

  const link = /^\[(\d+)\]\(jump:PROJECT:(\d+)\)$/.exec(cells[0]);
  const state = parseState(cells[4]);
  if (!link || !state) return null;

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(cells[9]) ? cells[9] : null;
  return {
    id: link[2],
    number: link[1],
    name: cells[1],
    client: cells[2] || "Onbekende klant",
    owner: cells[3],
    state,
    endDate,
  };
}

/** Parst de Markdown-tabel die ListProjects teruggeeft. */
export function parseProjectList(text: string): OrbitProject[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("| [") && line.includes("jump:PROJECT:"))
    .map(parseRow)
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

const cache = new Map<string, { projects: OrbitProject[]; fetchedAt: Date }>();

export function clearProjectCache(): void {
  cache.clear();
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
    if (pageProjects.length === 0 && result.text.includes("jump:PROJECT:")) {
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

/** Open projecten volgens het filter, met een cache van 15 minuten per gebruiker. */
export async function fetchProjects(
  email: string,
  filter: ProjectFilter,
): Promise<ProjectListResult> {
  const key = JSON.stringify([email, filter]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt.getTime() < CACHE_MS) {
    return { status: "ok", ...hit };
  }

  const result = await fetchAllPages(email, filter);
  if (result.status === "ok") cache.set(key, result);
  return result;
}
