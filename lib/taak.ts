/** Wat een taak is. Zonder database-import, zodat ook client components dit mogen gebruiken. */
export const STATUSSEN = [
  "niet-gestart",
  "bezig",
  "wacht",
  "klaar",
  "geblokkeerd",
] as const;
export type Status = (typeof STATUSSEN)[number];

export const STATUS_LABELS: Record<Status, string> = {
  "niet-gestart": "Niet gestart",
  bezig: "Bezig",
  wacht: "Wacht / review",
  klaar: "Klaar",
  geblokkeerd: "Geblokkeerd",
};

export const PRIOS = [1, 2, 3, 4] as const;
export type Prio = (typeof PRIOS)[number];

export const PRIO_LABELS: Record<Prio, string> = {
  1: "Urgent",
  2: "Hoog",
  3: "Middel",
  4: "Laag",
};

export const LIJSTEN = ["inbox", "todo", "genegeerd"] as const;
export type Lijst = (typeof LIJSTEN)[number];

export type Taak = {
  id: number;
  bron: "slack" | "eigen";
  titel: string;
  auteur: string | null;
  /** Kanaal of "Direct bericht"; leeg bij eigen taken. */
  plek: string | null;
  /** Unix-seconden. */
  tijd: number | null;
  url: string | null;
  /** Waarom het in de inbox staat, zoals "Bewaard". */
  soort: string | null;
  lijst: Lijst;
  status: Status;
  prio: Prio;
};

/** Parsers voor waarden uit de browser; een server action krijgt niets gegarandeerd. */
export const parseStatus = (waarde: unknown): Status | null =>
  STATUSSEN.find((status) => status === waarde) ?? null;
export const parsePrio = (waarde: unknown): Prio | null =>
  PRIOS.find((prio) => prio === waarde) ?? null;
export const parseLijst = (waarde: unknown): Lijst | null =>
  LIJSTEN.find((lijst) => lijst === waarde) ?? null;
