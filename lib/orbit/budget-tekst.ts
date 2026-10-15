/** Eén taak in Orbit waarop uren geschreven worden. Uren in minuten. */
export type Schrijfregel = {
  id: string;
  naam: string;
  afgesloten: boolean;
  /** Wat er nu in Orbit op de taak staat; aanpasbaar, dus niet per se wat er verkocht is. */
  beschikbaar: number;
  geschreven: number;
  /** Wat er in de planner staat ("scheduled in the planner"), 0 als dat niet vermeld wordt. */
  gepland: number;
};

/** Een map (hoofdstuk) zoals GetProject die teruggeeft: alleen de onderste laag. */
export type BudgetMap = { id: string; naam: string; regels: Schrijfregel[] };

/** "31h 30m", "12h" of "0m" naar minuten. */
export function parseDuur(text: string): number {
  const uren = /(\d+)h/.exec(text)?.[1] ?? "0";
  const minuten = /(\d+)m/.exec(text)?.[1] ?? "0";
  return Number(uren) * 60 + Number(minuten);
}

const GEPLAND = /scheduled in the planner ([\dhm ]+)/;
const MAP_REGEL = /^\*\*(.+?)\*\*\s+\[chapter api_id: (\w+)\]/;
const TAAK_REGEL =
  /^- (.+?)\s+\[api_id: (\w+)\](.*?)planned ([\dhm ]+)(?:\s*\([^)]*\))?, done ([\dhm ]+)/;

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
      id: taak[2],
      naam: taak[1],
      afgesloten: taak[3].includes("(closed)"),
      beschikbaar: parseDuur(taak[4]),
      geschreven: parseDuur(taak[5]),
      gepland: parseDuur(GEPLAND.exec(line)?.[1] ?? ""),
    });
  }
  return mappen;
}

/** Uren en mappen uit de tekst van GetProject; de offerte komt er later bij. */
export function parseProjectUren(project: string) {
  const workload = /\*\*Workload:\*\*.*?done (\d+)m \/ total (\d+)m/.exec(
    project,
  );
  return {
    beschikbaar: Number(workload?.[2] ?? 0),
    geschreven: Number(workload?.[1] ?? 0),
    mappen: parseMappen(project),
    start: /\*\*Period:\*\* (\d{4}-\d{2}-\d{2})/.exec(project)?.[1] ?? null,
  };
}
