/** Waar een meeting in de notulen-flow staat. Zonder database-import, zodat dit los te testen is en ook in client components mag. */
import type { Actiepunt } from "./actiepunt.ts";
import { type Meeting, PRIVE } from "./meetings.ts";
import type { DeelInfo, Onderdeel } from "./notulen-delen.ts";
import type { Passage } from "./weggelaten.ts";

export const STAPPEN = [
  "Ingepland",
  "Opname",
  "Transcript",
  "Notulen",
  "Akkoord",
  "In Superhuman",
  "Gedeeld",
  "Actiepunten",
] as const;

/** Klaar, wacht op jou, dashboard bezig, vastgelopen of geen notulen. */
export type Stand = "ok" | "jij" | "open" | "warn" | "muted";

/** Wat er per meeting in de database staat. `stap` is het aantal afgeronde stappen. */
export type NotulenRij = {
  meetingId: string;
  stap: number;
  opnameId: string | null;
  tekst: string | null;
  paginaUrl: string | null;
  fout: string | null;
  /** Het Slack-bericht dat Claude schreef (intern en Team). */
  slackTekst: string | null;
  /** De mail aan de klant (extern) en het Slack-bericht. */
  mail: Onderdeel;
  slack: Onderdeel;
  /** Zijn de actiepunten uit de notulen gehaald? */
  actiesUit: boolean;
  /** Gekozen voor Niet delen: Gedeeld is afgerond zonder dat er iets weg ging. */
  nietGedeeld: boolean;
  /** Gekozen voor Al gedeeld: het is elders gedeeld, er ging niets via het dashboard. */
  elders: boolean;
  /** Handmatig gekozen voor Geen opname: het dashboard koppelt er niet zelf een. */
  geenOpname?: boolean;
  /** Passages over personen die Claude uit de notulen liet. */
  weggelaten?: Passage[];
  /** De opname in Plaud is opgeruimd (Gedaan bij de melding). */
  plaudGedaan?: boolean;
  /** Akkoord gegeven op de notulen; pas daarna gaan ze naar Superhuman. */
  akkoord?: boolean;
  /** Wanneer de notulen in het dashboard voor het laatst zijn aangepast (ms). */
  bewerkt?: number | null;
};

/** Een Plaud-opname zoals het paneel hem toont. */
export type OpnameInfo = {
  id: string;
  naam: string;
  /** Begin in ms (UTC). */
  start: number;
  duurMs: number;
  /** Titel van de andere meeting waar deze opname nu aan hangt. */
  bezetDoor: string | null;
};

export type OpnameKeuzes =
  { gekoppeld: OpnameInfo | null; opties: OpnameInfo[] } | { fout: string };

export type NotulenStatus = {
  stap: number;
  stand: Stand;
  tekst: string;
  /** Vastgelopen: 4 uur na de meeting nog geen opname, transcript of gedeelde notulen. */
  vast: boolean;
  fout: string | null;
  opnameId: string | null;
  notulen: string | null;
  paginaUrl: string | null;
  slackTekst: string | null;
  mail: Onderdeel;
  slack: Onderdeel;
  nietGedeeld: boolean;
  elders: boolean;
  geenOpname: boolean;
  /** Ontvangers of kanaal voor de stap Gedeeld; de pagina vult dit in. */
  delen: DeelInfo | null;
  weggelaten: Passage[];
  /** Toon "Ruim de opname in Plaud op": er is iets weggelaten en het is nog niet opgeruimd. */
  plaudOpruimen: boolean;
  akkoord: boolean;
  /** Laatst aangepast in het dashboard (ms), voor "Concept opgeslagen om". */
  bewerkt: number | null;
  /** De meeting loopt volgens de agenda nog (stap 0): Ingepland is de actieve stap. */
  lopend: boolean;
  /** Met "Meeting al afgelopen" klaar gezet terwijl de agendatijd nog loopt. */
  vroegKlaar: boolean;
  /** Zijn de actiepunten uit de notulen gehaald? Kan al vóór Superhuman en Gedeeld. */
  actiesUit: boolean;
  /** De actiepunten van deze meeting, als ze uitgelezen zijn; de pagina vult dit in. */
  acties: Actiepunt[] | null;
};

/** De opname in Plaud web; de URL gebruikt het id zonder "of_". */
export const plaudWebUrl = (id: string) =>
  `https://web.plaud.ai/file/${id.replace(/^of_/, "")}`;

export const VASTGELOPEN_MS = 4 * 60 * 60 * 1000;

const MISLUKT = [
  "",
  "Opname zoeken mislukt",
  "Transcript ophalen mislukt",
  "Notulen maken mislukt",
  "Naar Superhuman mislukt",
  "Delen mislukt",
];

/**
 * De status van één meeting; null als er geen notulen-flow is: nog niet
 * geweest, of afgelopen vóór het dashboard notulen ging maken (`vanaf`).
 */
export function notulenStatus(
  meeting: Pick<
    Meeting,
    | "hoort"
    | "overgeslagen"
    | "afgelopen"
    | "einde"
    | "extern"
    | "start"
    | "tot"
    | "vroegKlaar"
  >,
  rij: NotulenRij | undefined,
  vanaf: number | null,
  nu: number,
): NotulenStatus | null {
  const basis = {
    stap: rij?.stap ?? 1,
    vast: false,
    fout: rij?.fout ?? null,
    opnameId: rij?.opnameId ?? null,
    notulen: rij?.tekst ?? null,
    paginaUrl: rij?.paginaUrl ?? null,
    slackTekst: rij?.slackTekst ?? null,
    mail: rij?.mail ?? { stand: "open", url: null },
    slack: rij?.slack ?? { stand: "open", url: null },
    nietGedeeld: rij?.nietGedeeld ?? false,
    elders: rij?.elders ?? false,
    geenOpname: rij?.geenOpname ?? false,
    delen: null,
    lopend: false,
    weggelaten: rij?.weggelaten ?? [],
    plaudOpruimen: (rij?.weggelaten?.length ?? 0) > 0 && !rij?.plaudGedaan,
    vroegKlaar: meeting.vroegKlaar,
    actiesUit: rij?.actiesUit ?? false,
    acties: null,
    akkoord: rij?.akkoord ?? false,
    bewerkt: rij?.bewerkt ?? null,
  };
  if (meeting.overgeslagen) {
    return {
      ...basis,
      stap: rij?.stap ?? 0,
      stand: "muted",
      tekst: "Geen notulen",
    };
  }
  const eind = Date.parse(meeting.einde);
  if (!meeting.afgelopen) {
    // Loopt hij nu, dan staan de stappen er al, met Ingepland als actieve stap.
    const lopend = vanaf !== null && Date.parse(meeting.start) <= nu;
    if (!lopend) return null;
    return {
      ...basis,
      stap: 0,
      lopend,
      stand: "open",
      tekst: `Loopt nog tot ${meeting.tot}`,
    };
  }
  if (!rij && (vanaf === null || eind < vanaf)) return null;

  const { stap } = basis;
  if (basis.geenOpname && stap <= 1)
    return { ...basis, stand: "muted", tekst: "Geen opname" };
  if (basis.fout)
    return { ...basis, stand: "warn", tekst: MISLUKT[stap] ?? "Mislukt" };
  const vast = stap <= 2 && nu - eind > VASTGELOPEN_MS;
  if (stap <= 1) {
    return vast
      ? { ...basis, vast, stand: "warn", tekst: "Geen opname gevonden" }
      : { ...basis, stand: "open", tekst: "Wacht op opname" };
  }
  if (stap === 2) {
    return vast
      ? { ...basis, vast, stand: "warn", tekst: "Transcript ontbreekt" }
      : {
          ...basis,
          stand: "jij",
          tekst: "Wacht op jou: auto-generate in Plaud",
        };
  }
  if (stap === 3)
    return { ...basis, stand: "open", tekst: "Claude maakt notulen" };
  if (stap === 4 && !basis.akkoord)
    return {
      ...basis,
      stand: "jij",
      tekst: "Wacht op jou: notulen lezen en akkoord geven",
    };
  if (stap === 4) return { ...basis, stand: "open", tekst: "Naar Superhuman" };
  // Na Gedeeld, of na Superhuman bij Privé: klaar zodra de actiepunten eruit zijn.
  if (stap >= 6 || meeting.hoort === PRIVE) {
    return rij?.actiesUit
      ? { ...basis, stap: 7, stand: "ok", tekst: "Klaar" }
      : { ...basis, stand: "open", tekst: "Actiepunten uitlezen" };
  }
  if (nu - eind > VASTGELOPEN_MS)
    return { ...basis, vast: true, stand: "warn", tekst: "Nog niet gedeeld" };
  if (!basis.slackTekst)
    return {
      ...basis,
      stand: "open",
      tekst: "Claude schrijft het Slack-bericht",
    };
  return { ...basis, stand: "jij", tekst: "Wacht op jou: delen" };
}

/**
 * Het aantal afgeronde stappen in STAPPEN. De database telt Akkoord niet als
 * eigen stap (`stap` 4 = notulen klaar), dus na akkoord komt er één bij.
 */
export const stappenKlaar = (status: NotulenStatus) =>
  status.stap + (status.akkoord ? 1 : 0);

/** Nog te doen: een status die niet klaar en niet overgeslagen is. */
export const nogTeDoen = (status: NotulenStatus | null) =>
  status !== null &&
  !status.lopend &&
  status.stand !== "ok" &&
  status.stand !== "muted";
