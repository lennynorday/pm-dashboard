import { dagPlus, maandagVan } from "./sprint.ts";

/** Een afspraak uit Google Agenda, teruggebracht tot wat het dashboard nodig heeft. */
export type AgendaItem = {
  id: string;
  /** De serie (recurringEventId in Google); null bij een losse afspraak. */
  serieId: string | null;
  titel: string;
  /** ISO 8601 met tijdzone. */
  start: string;
  eind: string;
  /** E-mailadressen van de andere deelnemers, zonder mezelf en zonder zalen. */
  deelnemers: string[];
};

export const TEAM = "team";
export const PRIVE = "prive";

export type Scope = "deze" | "serie" | "titel";
export type RegelSoort = "meeting" | "serie" | "titel";

/** Een handmatige keuze waar meetings bij horen. Doel: een platform-slug, "team" of "prive". */
export type Regel = {
  soort: RegelSoort;
  /** Het meeting-id, het serie-id of het titelwoord (kleine letters). */
  sleutel: string;
  doel: string;
  titel: string;
  /** Bij een serie: geldt voor afspraken die op of na dit moment (ms) beginnen. */
  vanaf: number | null;
  /** Bij een Team-serie: het Slack-kanaal voor de notulen. */
  kanaal: string | null;
};

export type Overslaan = {
  soort: "meeting" | "serie";
  sleutel: string;
  titel: string;
};

export type PlatformNaam = { slug: string; naam: string; roepnamen: string[] };

export type Meeting = {
  id: string;
  serieId: string | null;
  titel: string;
  start: string;
  /** ISO 8601, zoals in de agenda. */
  einde: string;
  datum: string;
  van: string;
  tot: string;
  /** Minuten na middernacht, lokale tijd. */
  begin: number;
  eind: number;
  /** Een platform-slug, "team" of "prive". */
  hoort: string;
  label: string;
  extern: boolean;
  /** E-mailadressen van de andere deelnemers. */
  deelnemers: string[];
  overgeslagen: "meeting" | "serie" | null;
  afgelopen: boolean;
  /** Naast elkaar bij overlap: kolom (vanaf 0) van het aantal kolommen. */
  kolom: number;
  kolommen: number;
};

export type Week = {
  maandag: string;
  /** Maandag t/m vrijdag. */
  dagen: string[];
  nummer: number;
  label: string;
};

const TIJDZONE = "Europe/Amsterdam";
const delen = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIJDZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dagMaand = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const DAG_MS = 24 * 60 * 60 * 1000;
const utc = (datum: string) => Date.parse(`${datum}T00:00:00Z`);
const kort = (datum: string) => dagMaand.format(utc(datum)).replaceAll(".", "");

/** Datum en minuten na middernacht in Nederlandse tijd. */
export function lokaal(iso: string): { datum: string; minuten: number } {
  const p = Object.fromEntries(
    delen.formatToParts(new Date(iso)).map((deel) => [deel.type, deel.value]),
  );
  return {
    datum: `${p.year}-${p.month}-${p.day}`,
    minuten: Number(p.hour) * 60 + Number(p.minute),
  };
}

export const tijd = (minuten: number) =>
  `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;

/** De werkweek (ma–vr) waar `datum` in valt, met ISO-weeknummer. */
export function weekVan(datum: string): Week {
  const maandag = maandagVan(datum);
  const dagen = [0, 1, 2, 3, 4].map((n) => dagPlus(maandag, n));
  // Het ISO-weeknummer volgt het jaar van de donderdag.
  const donderdag = dagen[3];
  const nummer =
    Math.floor(
      (utc(donderdag) - utc(`${donderdag.slice(0, 4)}-01-01`)) / DAG_MS / 7,
    ) + 1;
  const vrijdag = dagen[4];
  const van =
    maandag.slice(5, 7) === vrijdag.slice(5, 7)
      ? String(Number(maandag.slice(8)))
      : kort(maandag);
  return {
    maandag,
    dagen,
    nummer,
    label: `Week ${nummer} · ${van}–${kort(vrijdag)}`,
  };
}

const escape = (tekst: string) => tekst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Staat `woord` als heel woord (of hele woordgroep) in de titel, hoofdletterongevoelig? */
export function alsWoordIn(titel: string, woord: string): boolean {
  const schoon = woord.trim();
  if (!schoon) return false;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escape(schoon)}(?![\\p{L}\\p{N}])`,
    "iu",
  ).test(titel);
}

/** Het woord voor een titelregel: wat vóór de "|" staat, anders de hele titel. */
export function titelWoord(titel: string): string {
  return titel.split("|")[0].trim();
}

/**
 * Waar een afspraak bij hoort. Volgorde: de handmatige regels (meeting, serie, titelwoord), dan de platformnaam of een roepnaam in de titel,
 * anders Privé.
 */
export function hoortBij(
  item: AgendaItem,
  platforms: PlatformNaam[],
  regels: Regel[],
): string {
  const start = Date.parse(item.start);
  const bestaat = (regel: Regel) =>
    regel.doel === TEAM ||
    regel.doel === PRIVE ||
    platforms.some((platform) => platform.slug === regel.doel);
  const geldig = regels.filter(bestaat);
  const handmatig =
    geldig.find((r) => r.soort === "meeting" && r.sleutel === item.id) ??
    geldig.find(
      (r) =>
        r.soort === "serie" &&
        r.sleutel === item.serieId &&
        (r.vanaf ?? 0) <= start,
    ) ??
    geldig.find(
      (r) => r.soort === "titel" && alsWoordIn(item.titel, r.sleutel),
    );
  if (handmatig) return handmatig.doel;
  // De langste naam eerst, zodat "Kunsthal Kids" wint van "Kunsthal".
  const kandidaat = platforms
    .flatMap((platform) =>
      [platform.naam, ...platform.roepnamen].map((naam) => ({
        slug: platform.slug,
        naam,
      })),
    )
    .sort((a, b) => b.naam.length - a.naam.length)
    .find(({ naam }) => alsWoordIn(item.titel, naam));
  return kandidaat?.slug ?? PRIVE;
}

export function labelVan(hoort: string, platforms: PlatformNaam[]): string {
  if (hoort === TEAM) return "Team";
  if (hoort === PRIVE) return "Privé";
  return platforms.find((platform) => platform.slug === hoort)?.naam ?? hoort;
}

function overgeslagenAls(
  item: AgendaItem,
  overgeslagen: Overslaan[],
): Meeting["overgeslagen"] {
  if (
    overgeslagen.some((o) => o.soort === "serie" && o.sleutel === item.serieId)
  )
    return "serie";
  if (overgeslagen.some((o) => o.soort === "meeting" && o.sleutel === item.id))
    return "meeting";
  return null;
}

/** Zet overlappende meetings van één dag naast elkaar. */
export function naastElkaar<T extends { begin: number; eind: number }>(
  items: T[],
): (T & { kolom: number; kolommen: number })[] {
  const gesorteerd = [...items].sort(
    (a, b) => a.begin - b.begin || b.eind - a.eind,
  );
  const uit: (T & { kolom: number; kolommen: number })[] = [];
  let groep: (T & { kolom: number })[] = [];
  let banen: number[] = [];
  let groepEind = -1;
  const sluit = () => {
    const kolommen = banen.length;
    for (const item of groep) uit.push({ ...item, kolommen });
    groep = [];
    banen = [];
  };
  for (const item of gesorteerd) {
    if (item.begin >= groepEind) sluit();
    const vrij = banen.findIndex((eind) => eind <= item.begin);
    const kolom = vrij === -1 ? banen.length : vrij;
    banen[kolom] = item.eind;
    groep.push({ ...item, kolom });
    groepEind = Math.max(groepEind, item.eind);
  }
  sluit();
  return uit;
}

/** De meetings van deze werkweek, gesorteerd op dag en tijd. Afspraken zonder andere deelnemers (focusblokken) vallen weg. */
export function bepaalMeetings(
  items: AgendaItem[],
  week: Week,
  platforms: PlatformNaam[],
  regels: Regel[],
  overgeslagen: Overslaan[],
  domein: string,
  nu: number,
): Meeting[] {
  const basis = items.flatMap((item) => {
    const begin = lokaal(item.start);
    if (!week.dagen.includes(begin.datum) || item.deelnemers.length === 0)
      return [];
    const einde = lokaal(item.eind);
    // Loopt hij door na middernacht, dan eindigt hij voor de week om 24:00.
    const eind = einde.datum === begin.datum ? einde.minuten : 24 * 60;
    const hoort = hoortBij(item, platforms, regels);
    return [
      {
        id: item.id,
        serieId: item.serieId,
        titel: item.titel,
        start: item.start,
        einde: item.eind,
        datum: begin.datum,
        van: tijd(begin.minuten),
        tot: tijd(eind),
        begin: begin.minuten,
        eind,
        hoort,
        label: labelVan(hoort, platforms),
        extern: item.deelnemers.some(
          (email) => !email.toLowerCase().endsWith(`@${domein}`),
        ),
        deelnemers: item.deelnemers,
        overgeslagen: overgeslagenAls(item, overgeslagen),
        afgelopen: Date.parse(item.eind) < nu,
      },
    ];
  });
  return week.dagen
    .flatMap((dag) => naastElkaar(basis.filter((m) => m.datum === dag)))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.begin - b.begin);
}
