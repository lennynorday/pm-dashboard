/** Actiepunten uit notulen: uitlezen, van wie, en een Slack-gebruiker bij een naam. Zonder database-import, zodat dit los te testen is en ook in client components mag. */

export const ACTIE_STATUSSEN = [
  "open",
  "herinnerd",
  "todo",
  "gedaan",
  "genegeerd",
] as const;
export type ActieStatus = (typeof ACTIE_STATUSSEN)[number];

export const ACTIE_STATUS_LABELS: Record<ActieStatus, string> = {
  open: "Open",
  herinnerd: "Herinnerd",
  todo: "In je to-do's",
  gedaan: "Gedaan",
  genegeerd: "Genegeerd",
};

export const parseActieStatus = (waarde: unknown): ActieStatus | null =>
  ACTIE_STATUSSEN.find((status) => status === waarde) ?? null;

/** Open en herinnerd staan nog in de feed; de rest is afgehandeld. */
export const inFeed = (status: ActieStatus) =>
  status === "open" || status === "herinnerd";

/** Eén actie zoals die uit de notulen komt. */
export type GelezenActie = {
  /** De naam na "Actie", zoals in de notulen. */
  eigenaar: string;
  wat: string;
  /** De kop "## N. Onderwerp" zonder nummer; null boven de eerste kop. */
  onderwerp: string | null;
};

/** Een actiepunt met zijn meeting, zoals de pagina en de overlay het tonen. */
export type Actiepunt = GelezenActie & {
  id: number;
  meetingId: string;
  /** Titel van de meeting. */
  meeting: string;
  /** Platform, Team of Privé. */
  label: string;
  start: string;
  paginaUrl: string | null;
  status: ActieStatus;
  /** Wanneer Lenny de eigenaar herinnerde (ms). */
  herinnerd: number | null;
  vanMij: boolean;
};

const ACTIE = /\*\*Actie\s+([^*:]+?)\s*:\s*\*\*\s*(.+)$/i;

/** Haalt elke "**Actie Naam:** wat" uit de notulen, met het onderwerp erboven. */
export function leesActies(notulen: string): GelezenActie[] {
  const acties: GelezenActie[] = [];
  let onderwerp: string | null = null;
  for (const regel of notulen.split("\n")) {
    const kop = /^#{1,6}\s+(?:\d+\.\s*)?(.+)$/.exec(regel.trim());
    if (kop) {
      onderwerp = kop[1].trim();
      continue;
    }
    const actie = ACTIE.exec(regel);
    if (!actie) continue;
    const wat = actie[2].trim();
    if (wat) acties.push({ eigenaar: actie[1].trim(), wat, onderwerp });
  }
  return acties;
}

const klein = (naam: string) =>
  naam
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/** Is de actie van Lenny: Lennart, Lenny, Lennart ter Haar of de voornaam uit de sessie. */
export function isVanMij(eigenaar: string, voornaam: string): boolean {
  const namen = ["lennart", "lenny", "lennart ter haar", klein(voornaam)];
  return namen.includes(klein(eigenaar));
}

/** Een Slack-gebruiker om een herinnering naar te sturen. */
export type SlackPersoon = { id: string; naam: string };

/**
 * De Slack-gebruiker bij een naam uit de notulen: eerst op volledige naam, dan
 * op voornaam. Null als dat niet eenduidig is of niemand past.
 */
export function koppelNaam(
  naam: string,
  personen: SlackPersoon[],
): SlackPersoon | null {
  const gezocht = klein(naam);
  if (!gezocht) return null;
  const volledig = personen.filter((p) => klein(p.naam) === gezocht);
  if (volledig.length === 1) return volledig[0];
  if (volledig.length > 1) return null;
  const voornaam = personen.filter(
    (p) => klein(p.naam).split(" ")[0] === gezocht,
  );
  return voornaam.length === 1 ? voornaam[0] : null;
}
