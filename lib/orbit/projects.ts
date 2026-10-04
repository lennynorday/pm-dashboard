import { callOrbitTool } from "./client";

export const PROJECT_STATES = ["DRAFT", "OPEN", "CLOSED", "ARCHIVED"] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];

export const BILLING_MODES = [
  "NONE",
  "ESTIMATE",
  "HOURS",
  "FIXED",
  "OFFER",
  "SUBSCRIPTION",
] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export type OrbitProject = {
  /** Het interne id van Orbit. */
  id: string;
  /** Het projectnummer dat je in Orbit ziet, bijvoorbeeld "1607". */
  number: string;
  name: string;
  client: string;
  owner: string;
  state: ProjectState;
  billing: BillingMode | null;
  endDate: string | null;
};

function parseState(value: string): ProjectState | null {
  return PROJECT_STATES.find((state) => state === value) ?? null;
}

function parseBilling(value: string): BillingMode | null {
  return BILLING_MODES.find((mode) => mode === value) ?? null;
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
    billing: parseBilling(cells[5]),
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
let cache: { projects: OrbitProject[]; fetchedAt: Date } | null = null;

export function clearProjectCache(): void {
  cache = null;
}

/** Open projecten waar ik eigenaar van ben, met een cache van 15 minuten. */
export async function fetchMyProjects(): Promise<ProjectListResult> {
  if (cache && Date.now() - cache.fetchedAt.getTime() < CACHE_MS) {
    return { status: "ok", ...cache };
  }

  const result = await callOrbitTool("ListProjects", {
    mine: true,
    states: "OPEN",
    pageSize: 100,
  });
  if (result.status !== "ok") return result;

  cache = { projects: parseProjectList(result.text), fetchedAt: new Date() };
  return { status: "ok", ...cache };
}
