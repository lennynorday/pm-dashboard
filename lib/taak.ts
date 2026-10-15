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

export const BRONNEN_TAAK = ["slack", "gmail", "feed", "eigen"] as const;
export type Bron = (typeof BRONNEN_TAAK)[number];

export const BRON_LABELS: Record<Bron, string> = {
  slack: "Slack",
  gmail: "Gmail",
  feed: "Feed",
  eigen: "Eigen",
};

export const MAX_TITEL = 120;

/** Een melding uit Mijn feed op Overzicht die naar de to-do's gaat. */
export type FeedTodo = {
  id: string;
  titel: string;
  detail: string;
  /** Platform of klant waar de melding bij hoort. */
  plek: string;
  url: string;
};

/** De bronnen die in de Inbox stromen; per gebruiker aan of uit te zetten. */
export const INBOX_BRONNEN = ["slack", "gmail"] as const;
export type InboxBron = (typeof INBOX_BRONNEN)[number];

export const parseInboxBron = (waarde: unknown): InboxBron | null =>
  INBOX_BRONNEN.find((bron) => bron === waarde) ?? null;

/** Een regel op de uitsluitlijst van Gmail: een heel adres of een domein. */
export type Uitsluiting = { waarde: string; soort: "afzender" | "domein" };

/** Het domein van een e-mailadres, in kleine letters. */
export const domeinVan = (adres: string): string =>
  adres.slice(adres.lastIndexOf("@") + 1).toLowerCase();

/** Of mail van dit adres op de uitsluitlijst staat, als adres of als domein. */
export function isUitgesloten(
  adres: string,
  uitsluitingen: Uitsluiting[],
): boolean {
  const klein = adres.toLowerCase();
  return uitsluitingen.some(({ waarde, soort }) =>
    soort === "afzender" ? waarde === klein : waarde === domeinVan(klein),
  );
}

export type Taak = {
  id: number;
  bron: Bron;
  titel: string;
  auteur: string | null;
  /** E-mailadres van de afzender; alleen bij Gmail. */
  afzender: string | null;
  /** Kanaal of "Direct bericht"; leeg bij eigen taken. */
  plek: string | null;
  /** Unix-seconden. */
  tijd: number | null;
  url: string | null;
  /** De tekst van het oorspronkelijke bericht of de melding; de titel is de eigen tekst. */
  bericht: string | null;
  /** Waarom het in de inbox staat, zoals "Bewaard". */
  soort: string | null;
  lijst: Lijst;
  status: Status;
  prio: Prio;
  /** Plek in de eigen volgorde van de kolom; null = nog niet verplaatst, dus bovenaan. */
  positie: number | null;
  /** Unix-seconden van een nieuwe reactie op deze to-do die je nog niet hebt gezien. */
  reactie: number | null;
};

/** Parsers voor waarden uit de browser; een server action krijgt niets gegarandeerd. */
export const parseStatus = (waarde: unknown): Status | null =>
  STATUSSEN.find((status) => status === waarde) ?? null;
export const parsePrio = (waarde: unknown): Prio | null =>
  PRIOS.find((prio) => prio === waarde) ?? null;
export const parseBron = (waarde: unknown): Bron | null =>
  BRONNEN_TAAK.find((bron) => bron === waarde) ?? null;
export const parseLijst = (waarde: unknown): Lijst | null =>
  LIJSTEN.find((lijst) => lijst === waarde) ?? null;
