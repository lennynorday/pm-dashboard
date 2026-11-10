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
  /** Geen Norday-collega (niet in Slack): geen herinnering mogelijk. */
  extern: boolean;
  /** Een collega of een groep met collega's; niet "allen" of "iedereen". */
  teHerinneren: boolean;
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

/**
 * De acties die bij opnieuw uitlezen nieuw zijn: wat al bestaat (zelfde eigenaar
 * en wat) blijft staan met zijn status, de rest krijgt een nummer na het hoogste.
 */
export function nieuweActies(
  gelezen: GelezenActie[],
  bestaand: { eigenaar: string; wat: string; volgnummer: number }[],
): (GelezenActie & { volgnummer: number })[] {
  const sleutel = (actie: { eigenaar: string; wat: string }) =>
    `${klein(actie.eigenaar)}\n${klein(actie.wat)}`;
  const gezien = new Set(bestaand.map(sleutel));
  let volgnummer = Math.max(-1, ...bestaand.map((a) => a.volgnummer));
  return gelezen.flatMap((actie) => {
    if (gezien.has(sleutel(actie))) return [];
    gezien.add(sleutel(actie));
    volgnummer += 1;
    return [{ ...actie, volgnummer }];
  });
}

/** De personen in een eigenaar als "Theo en Kim", "Theo, Kim" of "Theo & Kim". */
export const delenVan = (eigenaar: string) =>
  eigenaar
    .split(/\s*(?:,|&|\/|\ben\b)\s*/i)
    .map((deel) => deel.trim())
    .filter(Boolean);

const IEDEREEN = ["allen", "iedereen", "team"];

/** "Allen", "iedereen" of "team": intern, maar niet één persoon om te herinneren. */
export const isIedereen = (eigenaar: string) =>
  delenVan(eigenaar).some((deel) => IEDEREEN.includes(klein(deel)));

/** Is de actie (ook) van Lenny: Lennart, Lenny, Lennart ter Haar of de voornaam uit de sessie. */
export function isVanMij(eigenaar: string, voornaam: string): boolean {
  const namen = ["lennart", "lenny", "lennart ter haar", klein(voornaam)];
  return delenVan(eigenaar).some((deel) => namen.includes(klein(deel)));
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

/**
 * Extern: geen van de namen komt voor in de Norday-Slack, op volledige naam of
 * voornaam. Meerdere treffers (niet eenduidig) telt als collega, dan kiest de
 * gebruiker. "Allen" en "iedereen" zijn intern. Zonder bekende Slack-leden
 * (null of leeg) is niemand extern.
 */
export function isExtern(
  eigenaar: string,
  personen: SlackPersoon[] | null,
): boolean {
  const delen = delenVan(eigenaar).map(klein);
  if (delen.length === 0 || !personen?.length || isIedereen(eigenaar))
    return false;
  return !delen.some((gezocht) =>
    personen.some((p) => {
      const naam = klein(p.naam);
      return naam === gezocht || naam.split(" ")[0] === gezocht;
    }),
  );
}

/** Wie je bij deze eigenaar kunt kiezen: bij een groep de collega's eruit, anders (of als er geen past) iedereen. */
export function kandidaten(
  eigenaar: string,
  personen: SlackPersoon[],
): SlackPersoon[] {
  const delen = delenVan(eigenaar);
  if (delen.length < 2) return personen;
  const gevonden = delen.flatMap((deel) => koppelNaam(deel, personen) ?? []);
  const uniek = personen.filter((p) => gevonden.includes(p));
  return uniek.length > 0 ? uniek : personen;
}
