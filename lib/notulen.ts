import { haalActiesUit } from "./actiepunten";
import { NOTULEN_TIMEOUT_MS, draaiClaude } from "./claude/run";
import {
  NOTULEN_SYSTEEMPROMPT,
  SLACK_SYSTEEMPROMPT,
  bouwNotulenPrompt,
  bouwSlackPrompt,
  parseNotulen,
  parseSlackBericht,
} from "./claude/notulen";
import type { Contactpersoon, PlatformGegevens } from "./accountgegevens";
import { loadDashboard } from "./dashboard";
import { database } from "./db";
import { DEMO } from "./demo";
import { stuurMail } from "./gmail/concept";
import { leesAgenda } from "./google/agenda";
import { NORDAY_DOMEIN } from "./google/oauth";
import type { LinkUrls } from "./links";
import { leesOvergeslagen, leesRegels } from "./meeting-regels";
import {
  type Meeting,
  type PlatformNaam,
  PRIVE,
  TEAM,
  alsWoordIn,
  bepaalMeetings,
  lokaal,
  weekVan,
} from "./meetings";
import {
  type DeelOnderdeel,
  type OnderdeelStand,
  deelAfgerond,
  deelKanaal,
  gmailThreadUrl,
  isNetwerkFout,
  parseOnderdeel,
} from "./notulen-delen";
import {
  type NotulenRij,
  type OpnameInfo,
  type OpnameKeuzes,
  VASTGELOPEN_MS,
} from "./notulen-stand";
import {
  type OpnameDetails,
  leesTranscript,
  opnameDetails,
  opnamesRondDag,
  recenteOpnames,
  verdeelOpnames,
} from "./plaud";
import {
  type Verwacht,
  zetFout as foutIn,
  zetStap as stapIn,
} from "./notulen-stap";
import { plaatsBericht } from "./slack/api";
import { dagPlus } from "./sprint";
import {
  LENNYS_DASHBOARD,
  type Pagina,
  docIdUitLink,
  leesPagina,
  leesPaginas,
  maakPagina,
} from "./superhuman-docs";

/** Een platform met zijn links (Superhuman, Slack) en contactpersonen (de PO). */
export type NotulenPlatform = PlatformNaam & {
  links: LinkUrls;
  contactpersonen: Contactpersoon[];
};

export const alsNotulenPlatform = (platform: {
  slug: string;
  naam: string;
  gegevens: PlatformGegevens;
}): NotulenPlatform => ({
  slug: platform.slug,
  naam: platform.naam,
  roepnamen: platform.gegevens.roepnamen,
  links: platform.gegevens.links,
  contactpersonen: platform.gegevens.contactpersonen,
});

const DAG_MS = 24 * 60 * 60 * 1000;

/** Alleen met NOTULEN_AAN=1 maakt deze omgeving notulen; anders doen staging en productie het allebei. */
export const notulenAan = () => process.env.NOTULEN_AAN === "1";

export const NOTULEN_UIT =
  "Notulen maken staat uit in deze omgeving. Zet NOTULEN_AAN=1 in .env.local om het aan te zetten.";
// Een run die langer bezig staat dan de time-out van Claude plus marge, is verloren gegaan.
const VERLOREN_MS = NOTULEN_TIMEOUT_MS + 3 * 60_000;
const tekst = (waarde: unknown) => (typeof waarde === "string" ? waarde : null);

/**
 * De platforms met hun Superhuman-links; null als Orbit niet te lezen is. Zonder
 * platforms zou elke meeting op Privé vallen en de notulen op de verkeerde plek komen.
 */
export async function notulenPlatforms(): Promise<NotulenPlatform[] | null> {
  const dashboard = await loadDashboard();
  if (dashboard.status !== "ok") return null;
  return dashboard.platforms.map(alsNotulenPlatform);
}

// ---------- Database ----------

/** Vanaf wanneer het dashboard notulen maakt; de eerste keer is dat nu. */
export function notulenVanaf(email: string, nu?: number): number | null {
  if (nu !== undefined) {
    database()
      .prepare(
        "INSERT OR IGNORE INTO notulen_start (email, vanaf) VALUES (?, ?)",
      )
      .run(email, nu);
  }
  const rij = database()
    .prepare("SELECT vanaf FROM notulen_start WHERE email = ?")
    .get(email);
  return typeof rij?.vanaf === "number" ? rij.vanaf : null;
}

function parseRij(email: string, rij: Record<string, unknown>): NotulenRij {
  return {
    meetingId: String(rij.meeting_id),
    stap: Number(rij.stap),
    opnameId: tekst(rij.opname_id),
    tekst: tekst(rij.tekst),
    paginaUrl: tekst(rij.pagina_url),
    fout: tekst(rij.fout),
    slackTekst: tekst(rij.slack_tekst),
    mail: parseOnderdeel(rij.mail_stand, rij.mail_url),
    slack: parseOnderdeel(rij.slack_stand, rij.slack_url),
    actiesUit: rij.acties_uit !== null,
    nietGedeeld: rij.niet_gedeeld !== null,
    elders: rij.elders !== null,
    geenOpname: rij.opname_keuze === "geen",
  };
}

export function leesNotulen(email: string, ids: string[]): NotulenRij[] {
  return database()
    .prepare(
      "SELECT * FROM notulen WHERE email = ? AND meeting_id IN (SELECT value FROM json_each(?))",
    )
    .all(email, JSON.stringify(ids))
    .map((rij) => parseRij(email, rij));
}

/** Een vastgelopen of mislukte meeting zoals de inbox hem toont. */
export type VastgelopenMeeting = {
  id: string;
  serieId: string | null;
  titel: string;
  label: string;
  start: string;
  stap: number;
  fout: string | null;
};

/**
 * Een fout bij het maken (meteen), of geen opname, transcript of gedeelde notulen 4 uur
 * na de meeting; zonder overgeslagen meetings en series.
 */
export function leesVastgelopen(email: string): VastgelopenMeeting[] {
  const nu = Date.now();
  return database()
    .prepare(
      `SELECT * FROM notulen n
       WHERE email = ? AND (fout IS NOT NULL OR stap <= 2 OR (stap = 5 AND hoort IS NOT 'prive'))
         AND opname_keuze IS NOT 'geen'
         AND NOT EXISTS (SELECT 1 FROM meetings_overgeslagen o WHERE o.email = n.email
           AND ((o.soort = 'meeting' AND o.sleutel = n.meeting_id)
             OR (o.soort = 'serie' AND o.sleutel = n.serie_id)))
       ORDER BY start DESC`,
    )
    .all(email)
    .filter(
      (rij) =>
        rij.fout !== null || nu - Date.parse(String(rij.eind)) > VASTGELOPEN_MS,
    )
    .map((rij) => ({
      id: String(rij.meeting_id),
      serieId: tekst(rij.serie_id),
      titel: String(rij.titel),
      label: String(rij.label),
      start: String(rij.start),
      stap: Number(rij.stap),
      fout: tekst(rij.fout),
    }));
}

/** Zet een nieuwe meeting op stap 1 (wacht op opname); titel en plek lopen mee met de agenda. */
function bewaarMeeting(email: string, meeting: Meeting): void {
  database()
    .prepare(
      `INSERT INTO notulen (email, meeting_id, serie_id, titel, label, hoort, extern, start, eind, stap, sinds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (email, meeting_id) DO UPDATE SET
         serie_id = excluded.serie_id, titel = excluded.titel, label = excluded.label,
         hoort = excluded.hoort, extern = excluded.extern,
         start = excluded.start, eind = excluded.eind`,
    )
    .run(
      email,
      meeting.id,
      meeting.serieId,
      meeting.titel,
      meeting.label,
      meeting.hoort,
      meeting.extern ? 1 : 0,
      meeting.start,
      meeting.einde,
      Date.parse(meeting.einde),
    );
}

type Rij = Record<string, unknown>;

function leesRij(email: string, id: string): Rij | undefined {
  return database()
    .prepare("SELECT * FROM notulen WHERE email = ? AND meeting_id = ?")
    .get(email, id);
}

const zetStap = (
  email: string,
  id: string,
  stap: number,
  verwacht: Verwacht,
  velden?: Parameters<typeof stapIn>[5],
) => stapIn(database(), email, id, stap, verwacht, velden);

const zetFout = (
  email: string,
  id: string,
  fout: string,
  verwacht?: Verwacht,
) => foutIn(database(), email, id, fout, verwacht);

/**
 * Claimt de meeting voor een run; false als er al een loopt. Delen (`ookBijFout`)
 * mag ook als het Slack-bericht van Claude mislukte: dat blokkeert de mail niet.
 */
function claim(email: string, id: string, ookBijFout = false): boolean {
  const nu = Date.now();
  const { changes } = database()
    .prepare(
      `UPDATE notulen SET bezig = ? WHERE email = ? AND meeting_id = ?
         AND (fout IS NULL OR ?) AND (bezig IS NULL OR bezig < ?)`,
    )
    .run(nu, email, id, ookBijFout ? 1 : 0, nu - VERLOREN_MS);
  return changes === 1;
}

const NOG_BEZIG = {
  fout: "Even wachten, er loopt nog iets voor deze meeting.",
};

function laatLos(email: string, id: string): void {
  database()
    .prepare(
      "UPDATE notulen SET bezig = NULL WHERE email = ? AND meeting_id = ?",
    )
    .run(email, id);
}

/** Opnieuw proberen: de fout gaat weg, het werk dat al gedaan is blijft. */
export function herstelNotulen(email: string, id: string): boolean {
  const { changes } = database()
    .prepare(
      "UPDATE notulen SET fout = NULL, bezig = NULL WHERE email = ? AND meeting_id = ? AND fout IS NOT NULL",
    )
    .run(email, id);
  return changes === 1;
}

// ---------- Meetings ----------

/** De meetings van deze en vorige werkweek, met waar ze bij horen. */
export async function meetingsVoorNotulen(
  email: string,
  platforms: PlatformNaam[],
  nu: number,
): Promise<Meeting[] | { fout: string }> {
  const deze = weekVan(lokaal(new Date(nu).toISOString()).datum);
  const weken = [weekVan(dagPlus(deze.maandag, -7)), deze];
  const agendas = await Promise.all(
    weken.map((week) => leesAgenda(email, week.maandag)),
  );
  const regels = leesRegels(email);
  const overgeslagen = leesOvergeslagen(email);
  const meetings: Meeting[] = [];
  for (const [index, agenda] of agendas.entries()) {
    if ("verbinden" in agenda)
      return { fout: "Geen toegang tot Google Agenda" };
    if ("fout" in agenda) return agenda;
    // Een privé-meeting met al een notulen-run wordt niet alsnog automatisch overgeslagen.
    const metNotulen = new Set(
      leesNotulen(
        email,
        agenda.items.map((item) => item.id),
      ).map((rij) => rij.meetingId),
    );
    meetings.push(
      ...bepaalMeetings(
        agenda.items,
        weken[index],
        platforms,
        regels,
        overgeslagen,
        NORDAY_DOMEIN,
        nu,
        metNotulen,
      ),
    );
  }
  return meetings;
}

// ---------- Verwerken ----------

const lopend = new Set<string>();
// Start en duur van een opname veranderen niet; dit scheelt Plaud-aanroepen elke 5 minuten.
const bekend = new Map<string, OpnameDetails>();

/**
 * Brengt elke afgelopen meeting die notulen krijgt een stap verder: opname
 * zoeken, transcript controleren, notulen maken en een pagina in Superhuman.
 * Loopt elke 5 minuten en bij het openen van Meetings; per gebruiker één tegelijk.
 */
export async function verwerkNotulen(
  email: string,
  platforms: NotulenPlatform[],
): Promise<void> {
  if (DEMO || !notulenAan() || lopend.has(email)) return;
  lopend.add(email);
  try {
    const nu = Date.now();
    const vanaf = notulenVanaf(email, nu) ?? nu;
    const meetings = await meetingsVoorNotulen(email, platforms, nu);
    if ("fout" in meetings) return;
    const bekendeIds = new Set(
      leesNotulen(
        email,
        meetings.map((m) => m.id),
      ).map((rij) => rij.meetingId),
    );
    const kandidaten = meetings.filter(
      (m) =>
        !m.overgeslagen &&
        m.afgelopen &&
        (Date.parse(m.einde) >= vanaf || bekendeIds.has(m.id)),
    );
    for (const meeting of kandidaten) bewaarMeeting(email, meeting);
    await zoekOpnames(email, kandidaten, meetings, nu);
    for (const meeting of kandidaten) {
      await verder(email, meeting, platforms);
    }
    // Ook notulen van vóór de actiepunten, en van meetings buiten deze twee weken.
    haalActiesUit(email);
  } catch (fout) {
    console.error("Notulen verwerken mislukt:", fout);
  } finally {
    lopend.delete(email);
  }
}

/**
 * Koppelt opnames aan meetings op stap 1. Een opname hoort bij de meeting waarmee
 * hij het langst overlapt, dus alle meetings tellen mee (`alle`), en een opname die
 * al aan een meeting hangt, gaat niet naar een tweede.
 */
async function zoekOpnames(
  email: string,
  meetings: Meeting[],
  alle: Meeting[],
  nu: number,
): Promise<void> {
  const zoeken = meetings.filter((m) => {
    const rij = leesRij(email, m.id);
    return rij?.stap === 1 && rij.fout === null && rij.opname_keuze === null;
  });
  if (zoeken.length === 0) return;
  const oudste = Math.min(...zoeken.map((m) => Date.parse(m.start)));
  // Het account is gedeeld: lees niet verder terug dan nodig, en nooit meer dan 14 dagen.
  const dagen = Math.min(14, Math.ceil((nu - oudste) / DAG_MS) + 1);
  const recent = await recenteOpnames(dagen);
  // Een storing bij Plaud zet geen meeting vast: de volgende ronde probeert het opnieuw.
  if ("fout" in recent)
    return console.error("Plaud: opnames zoeken mislukt:", recent.fout);
  const details = new Map<string, OpnameDetails>();
  const gelukt: Meeting[] = [];
  for (const meeting of zoeken) {
    let fout: string | null = null;
    for (const opname of opnamesRondDag(recent, meeting.datum)) {
      const gelezen = bekend.get(opname.id) ?? (await opnameDetails(opname.id));
      if ("fout" in gelezen) {
        fout = gelezen.fout;
        break;
      }
      bekend.set(opname.id, gelezen);
      details.set(opname.id, gelezen);
    }
    if (fout) console.error("Plaud: opname lezen mislukt:", fout);
    else gelukt.push(meeting);
  }
  const bezet = new Set(
    database()
      .prepare(
        `SELECT opname_id FROM notulen WHERE email = ? AND opname_id IS NOT NULL
         UNION SELECT opname_keuze FROM notulen WHERE email = ? AND opname_keuze IS NOT NULL AND opname_keuze != 'geen'`,
      )
      .all(email, email)
      .map((rij) => String(rij.opname_id)),
  );
  const verdeeld = verdeelOpnames(
    alle.map((m) => ({
      id: m.id,
      start: Date.parse(m.start),
      eind: Date.parse(m.einde),
    })),
    [...details.values()],
    bezet,
  );
  for (const meeting of gelukt) {
    const opnameId = verdeeld.get(meeting.id);
    if (opnameId)
      zetStap(
        email,
        meeting.id,
        2,
        { stap: 1, opnameId: null },
        { opname_id: opnameId },
      );
  }
}

/** Doet de volgende stappen zolang dat lukt; een fout blijft staan tot Opnieuw proberen. */
async function verder(
  email: string,
  meeting: Meeting,
  platforms: NotulenPlatform[],
): Promise<void> {
  const rij = leesRij(email, meeting.id);
  if (!rij || rij.fout !== null) return;
  const opnameId = tekst(rij.opname_id);
  if (rij.stap === 2 && opnameId) {
    const details = await opnameDetails(opnameId);
    if ("fout" in details)
      return console.error(
        "Plaud: transcript controleren mislukt:",
        details.fout,
      );
    if (!details.transcript) return;
    zetStap(email, meeting.id, 3, { stap: 2, opnameId });
  }
  if (Number(leesRij(email, meeting.id)?.stap) === 3) {
    if (!claim(email, meeting.id)) return;
    // Na de claim opnieuw lezen: intussen kan er een andere opname gekozen zijn.
    const verwacht: Verwacht = {
      stap: 3,
      opnameId: tekst(leesRij(email, meeting.id)?.opname_id),
    };
    if (!verwacht.opnameId) return laatLos(email, meeting.id);
    const uitkomst = await maakNotulen(meeting, verwacht.opnameId);
    // Is de rij tijdens de run teruggezet, dan telt dit resultaat niet.
    if ("fout" in uitkomst)
      return zetFout(email, meeting.id, uitkomst.fout, verwacht);
    zetStap(email, meeting.id, 4, verwacht, { tekst: uitkomst.tekst });
  }
  const klaar = leesRij(email, meeting.id);
  if (Number(klaar?.stap) === 4 && typeof klaar?.tekst === "string") {
    if (!claim(email, meeting.id)) return;
    try {
      await naarSuperhuman(email, meeting, klaar, platforms);
    } catch (fout) {
      // Na een time-out kan de pagina toch bestaan: de volgende ronde vindt hem op naam.
      if (isNetwerkFout(fout)) laatLos(email, meeting.id);
      else
        zetFout(
          email,
          meeting.id,
          fout instanceof Error ? fout.message : String(fout),
          { stap: 4, opnameId: tekst(klaar.opname_id) },
        );
    }
  }
  const gedeeld = leesRij(email, meeting.id);
  if (Number(gedeeld?.stap) === 5 && gedeeld && meeting.hoort !== PRIVE) {
    await bijDelen(email, meeting, gedeeld);
  }
}

/**
 * Laat Claude het Slack-bericht schrijven voor elke meeting die nog gedeeld
 * moet worden; bij een externe meeting gaat het naar het interne kanaal.
 */
async function bijDelen(email: string, meeting: Meeting, rij: Rij) {
  const paginaUrl = tekst(rij.pagina_url);
  const notulen = tekst(rij.tekst);
  if (rij.slack_tekst !== null || !paginaUrl || !notulen) return;
  if (!claim(email, meeting.id)) return;
  const run = await draaiClaude(
    bouwSlackPrompt({ titel: meeting.titel, link: paginaUrl, notulen }),
    SLACK_SYSTEEMPROMPT,
  );
  const bericht =
    "fout" in run ? run : parseSlackBericht(run.stdout, paginaUrl);
  const verwacht = { stap: 5, opnameId: tekst(rij.opname_id) };
  if ("fout" in bericht)
    return zetFout(email, meeting.id, bericht.fout, verwacht);
  database()
    .prepare(
      `UPDATE notulen SET slack_tekst = ?, bezig = NULL
       WHERE email = ? AND meeting_id = ? AND stap = 5 AND opname_id IS ?`,
    )
    .run(bericht.tekst, email, meeting.id, verwacht.opnameId);
}

// ---------- Delen, na een klik ----------

/** Een meeting die klaarstaat om te delen: in Superhuman en nog niet gedeeld. */
function teDelen(email: string, id: string): Rij | null {
  const rij = leesRij(email, id);
  if (Number(rij?.stap) !== 5 || rij?.hoort === PRIVE) return null;
  return rij ?? null;
}

const KOLOMMEN: Record<DeelOnderdeel, [string, string]> = {
  mail: ["mail_stand", "mail_url"],
  slack: ["slack_stand", "slack_url"],
};

/** Zet de stand van een onderdeel; null maakt het weer open. */
function zetOnderdeel(
  email: string,
  id: string,
  onderdeel: DeelOnderdeel,
  stand: Exclude<OnderdeelStand, "open"> | null,
  url: string | null = null,
): void {
  const [standKolom, urlKolom] = KOLOMMEN[onderdeel];
  database()
    .prepare(
      `UPDATE notulen SET ${standKolom} = ?, ${urlKolom} = ? WHERE email = ? AND meeting_id = ?`,
    )
    .run(stand, url, email, id);
}

/** Is elk onderdeel verstuurd of overgeslagen, dan is Delen klaar: Niet gedeeld als er niets verstuurd is. */
function rondDeelAf(email: string, id: string): boolean {
  const rij = teDelen(email, id);
  if (!rij) return false;
  const status = parseRij(email, rij);
  const uitkomst = deelAfgerond([
    status.slack.stand,
    ...(rij.extern === 1 ? [status.mail.stand] : []),
  ]);
  if (uitkomst === "open") return false;
  const nu = Date.now();
  const { changes } = database()
    .prepare(
      `UPDATE notulen SET stap = 6, sinds = ?, niet_gedeeld = ?, bezig = NULL, fout = NULL
       WHERE email = ? AND meeting_id = ? AND stap = 5`,
    )
    .run(nu, uitkomst === "niet" ? nu : null, email, id);
  return changes === 1;
}

/**
 * Verstuurt de mail aan de klant direct via Gmail, onder het account van de
 * gebruiker, en bewaart de thread voor "Openen in Gmail".
 */
export async function stuurDeelMail(
  email: string,
  id: string,
  mail: { aan: string[]; onderwerp: string; tekst: string },
): Promise<{ fout: string } | null> {
  const rij = teDelen(email, id);
  if (!rij || rij.extern !== 1 || rij.mail_stand !== null)
    return { fout: "Deze meeting staat niet klaar om te mailen" };
  // Tegen een dubbele klik: één mail per meeting.
  if (!claim(email, id, true)) return NOG_BEZIG;
  try {
    const { threadId } = await stuurMail(email, mail);
    zetOnderdeel(
      email,
      id,
      "mail",
      "verstuurd",
      gmailThreadUrl(email, threadId),
    );
    rondDeelAf(email, id);
    return null;
  } catch (fout) {
    // Misschien is hij toch verstuurd: geen nieuwe verzendknop, de gebruiker kijkt in Gmail.
    if (!isNetwerkFout(fout)) throw fout;
    zetOnderdeel(email, id, "mail", "onzeker");
    return null;
  } finally {
    laatLos(email, id);
  }
}

/**
 * Plaatst het (aangepaste) bericht onder de naam van de gebruiker in het
 * kanaal van het platform of de Team-serie.
 */
export async function deelInSlack(
  email: string,
  id: string,
  bericht: string,
  platforms: NotulenPlatform[],
): Promise<{ fout: string } | null> {
  const rij = teDelen(email, id);
  if (!rij || rij.slack_stand !== null)
    return { fout: "Deze meeting staat niet klaar om te delen" };
  const doel = deelKanaal(
    {
      hoort: String(rij.hoort),
      label: String(rij.label),
      serieId: tekst(rij.serie_id),
    },
    platforms,
    leesRegels(email),
  );
  if ("melding" in doel) return { fout: doel.melding };
  // Tegen een dubbele klik: één bericht per meeting.
  if (!claim(email, id, true)) return NOG_BEZIG;
  try {
    const { ts, permalink } = await plaatsBericht(email, doel.kanaal, bericht);
    database()
      .prepare(
        "UPDATE notulen SET slack_ts = ? WHERE email = ? AND meeting_id = ?",
      )
      .run(ts, email, id);
    zetOnderdeel(email, id, "slack", "verstuurd", permalink ?? null);
    rondDeelAf(email, id);
    return null;
  } catch (fout) {
    // Misschien staat het bericht er toch: geen nieuwe verzendknop, de gebruiker kijkt in Slack.
    if (!isNetwerkFout(fout)) throw fout;
    zetOnderdeel(email, id, "slack", "onzeker");
    return null;
  } finally {
    laatLos(email, id);
  }
}

/** Slaat een onderdeel over; zijn alle onderdelen klaar, dan is Delen afgerond. */
export function slaOnderdeelOver(
  email: string,
  id: string,
  onderdeel: DeelOnderdeel,
): boolean {
  const rij = teDelen(email, id);
  if (!rij || (onderdeel === "mail" && rij.extern !== 1)) return false;
  if (rij[KOLOMMEN[onderdeel][0]] !== null) return false;
  zetOnderdeel(email, id, onderdeel, "overgeslagen");
  rondDeelAf(email, id);
  return true;
}

/** Toch versturen: een overgeslagen of onzeker onderdeel is weer open, en Delen ook als het al afgerond was. */
export function heropenOnderdeel(
  email: string,
  id: string,
  onderdeel: DeelOnderdeel,
): boolean {
  const rij = leesRij(email, id);
  if (!rij || rij.hoort === PRIVE || Number(rij.stap) < 5) return false;
  const stand = rij[KOLOMMEN[onderdeel][0]];
  if (stand !== "overgeslagen" && stand !== "onzeker") return false;
  zetOnderdeel(email, id, onderdeel, null);
  database()
    .prepare(
      `UPDATE notulen SET stap = 5, sinds = ?, niet_gedeeld = NULL, elders = NULL
       WHERE email = ? AND meeting_id = ? AND stap = 6`,
    )
    .run(Date.now(), email, id);
  return true;
}

/** Al gedeeld na een onzekere verzending: de gebruiker zag hem in Gmail of Slack staan. */
export function bevestigVerstuurd(
  email: string,
  id: string,
  onderdeel: DeelOnderdeel,
): boolean {
  const rij = teDelen(email, id);
  if (!rij || rij[KOLOMMEN[onderdeel][0]] !== "onzeker") return false;
  zetOnderdeel(email, id, onderdeel, "verstuurd");
  rondDeelAf(email, id);
  return true;
}

/** Niet delen: alles wat nog open staat wordt overgeslagen, door naar de actiepunten. */
export function nietDelen(email: string, id: string): boolean {
  const rij = teDelen(email, id);
  if (!rij) return false;
  if (rij.slack_stand === null)
    zetOnderdeel(email, id, "slack", "overgeslagen");
  if (rij.extern === 1 && rij.mail_stand === null)
    zetOnderdeel(email, id, "mail", "overgeslagen");
  return rondDeelAf(email, id);
}

/** Al gedeeld: Delen is afgerond zonder dat het dashboard iets verstuurt, door naar de actiepunten. */
export function eldersGedeeld(email: string, id: string): boolean {
  const nu = Date.now();
  const { changes } = database()
    .prepare(
      `UPDATE notulen SET stap = 6, sinds = ?, elders = ?, bezig = NULL, fout = NULL
       WHERE email = ? AND meeting_id = ? AND stap = 5 AND hoort IS NOT 'prive'`,
    )
    .run(nu, nu, email, id);
  return changes === 1;
}

/** Ongedaan maken van Niet delen of Al gedeeld: terug naar de stap Delen; wat al verstuurd is blijft verstuurd. */
export function tochDelen(email: string, id: string): boolean {
  const { changes } = database()
    .prepare(
      `UPDATE notulen SET stap = 5, sinds = ?, niet_gedeeld = NULL, elders = NULL,
         mail_stand = CASE WHEN mail_stand = 'overgeslagen' THEN NULL ELSE mail_stand END,
         slack_stand = CASE WHEN slack_stand = 'overgeslagen' THEN NULL ELSE slack_stand END
       WHERE email = ? AND meeting_id = ? AND stap = 6
         AND (niet_gedeeld IS NOT NULL OR elders IS NOT NULL)`,
    )
    .run(Date.now(), email, id);
  return changes === 1;
}

const wanneerFormat = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

async function maakNotulen(
  meeting: Meeting,
  opnameId: string,
): Promise<{ tekst: string } | { fout: string }> {
  const transcript = await leesTranscript(opnameId);
  if (typeof transcript !== "string") return transcript;
  if (!transcript) return { fout: "Plaud gaf een leeg transcript" };
  const run = await draaiClaude(
    bouwNotulenPrompt({
      titel: meeting.titel,
      wanneer: `${wanneerFormat.format(Date.parse(meeting.start))}, ${meeting.van}–${meeting.tot}`,
      genodigden: meeting.deelnemers,
      standup:
        alsWoordIn(meeting.titel, "standup") ||
        alsWoordIn(meeting.titel, "stand-up"),
      transcript,
    }),
    NOTULEN_SYSTEEMPROMPT,
    NOTULEN_TIMEOUT_MS,
  );
  return "fout" in run ? run : parseNotulen(run.stdout);
}

/** "20261104 WO2 | Theo x Lenny" */
export const paginaNaam = (meeting: Pick<Meeting, "datum" | "titel">) =>
  `${meeting.datum.replaceAll("-", "")} ${meeting.titel}`;

/** Waar de notulen heen gaan: doc en ouderpagina. Gooit een duidelijke fout als een link of de pagina Notulen ontbreekt. */
async function bestemming(
  email: string,
  meeting: Meeting,
  platforms: NotulenPlatform[],
): Promise<{ docId: string; ouder: string; paginas?: Pagina[] }> {
  if (meeting.hoort === TEAM || meeting.hoort === PRIVE) {
    const { docId, notulen } = LENNYS_DASHBOARD;
    if (!meeting.serieId) return { docId, ouder: notulen };
    return { docId, ouder: await reeksPagina(email, meeting) };
  }
  const platform = platforms.find((p) => p.slug === meeting.hoort);
  const soort = meeting.extern ? "gedeelde" : "interne";
  const link =
    platform?.links[
      meeting.extern ? "superhuman-gedeeld" : "superhuman-intern"
    ];
  if (!platform || !link) {
    throw new Error(
      `Bij ${meeting.label} staat geen link naar de ${soort} Superhuman-doc. Voeg die toe bij de gegevens van het platform.`,
    );
  }
  const docId = docIdUitLink(link);
  if (!docId)
    throw new Error(
      `De link naar de ${soort} doc van ${platform.naam} is geen Superhuman-doc.`,
    );
  const paginas = await leesPaginas(docId);
  const notulen = paginas.find(
    (p) => p.naam.trim().toLowerCase() === "notulen",
  );
  if (!notulen) {
    throw new Error(
      `De ${soort} doc van ${platform.naam} heeft geen pagina Notulen. Maak die aan in Superhuman.`,
    );
  }
  return { docId, ouder: notulen.id, paginas };
}

/** De subpagina van een reeks onder Notulen in Lennys Dashboard; eenmalig aangemaakt en bewaard. */
async function reeksPagina(email: string, meeting: Meeting): Promise<string> {
  const serieId = meeting.serieId ?? "";
  const bewaard = database()
    .prepare(
      "SELECT pagina_id FROM notulen_reeksen WHERE email = ? AND serie_id = ?",
    )
    .get(email, serieId);
  if (typeof bewaard?.pagina_id === "string") return bewaard.pagina_id;
  const { docId, notulen } = LENNYS_DASHBOARD;
  const vanAnderen = paginaIds(
    "SELECT pagina_id FROM notulen_reeksen WHERE email = ?",
    email,
  );
  const bestaand = (await leesPaginas(docId)).find(
    (p) =>
      p.parentId === notulen &&
      p.naam === meeting.titel &&
      !vanAnderen.has(p.id),
  );
  const id =
    bestaand?.id ?? (await maakPagina(docId, notulen, meeting.titel, ""));
  database()
    .prepare(
      "INSERT OR IGNORE INTO notulen_reeksen (email, serie_id, pagina_id) VALUES (?, ?, ?)",
    )
    .run(email, serieId, id);
  return id;
}

/** Pagina-id's die al bij een andere rij horen; een pagina met dezelfde naam is dan niet die van ons. */
const paginaIds = (sql: string, ...params: string[]) =>
  new Set(
    database()
      .prepare(sql)
      .all(...params)
      .map((rij) => String(rij.pagina_id)),
  );

const wacht = (ms: number) => new Promise((klaar) => setTimeout(klaar, ms));

/**
 * Maakt de subpagina (één keer: het id staat meteen in de database) en wacht
 * op de link, want de API loopt 20 tot 30 seconden achter. Staat de pagina er
 * zonder link, dan haalt de volgende ronde hem op; staat hij er niet, dan is dat een fout.
 */
async function naarSuperhuman(
  email: string,
  meeting: Meeting,
  rij: Rij,
  platforms: NotulenPlatform[],
): Promise<void> {
  const verwacht: Verwacht = { stap: 4, opnameId: tekst(rij.opname_id) };
  let docId = tekst(rij.pagina_doc);
  let paginaId = tekst(rij.pagina_id);
  if (!docId || !paginaId) {
    const doel = await bestemming(email, meeting, platforms);
    // Na een andere opname komt er een nieuwe pagina; de oude blijft staan.
    const versie = Number(rij.pagina_versie ?? 0);
    const naam = paginaNaam(meeting) + (versie > 0 ? ` (${versie + 1})` : "");
    const paginas = doel.paginas ?? (await leesPaginas(doel.docId));
    const vanAnderen = paginaIds(
      "SELECT pagina_id FROM notulen WHERE email = ? AND meeting_id != ? AND pagina_id IS NOT NULL",
      email,
      meeting.id,
    );
    const bestaand = paginas.find(
      (p) =>
        p.parentId === doel.ouder && p.naam === naam && !vanAnderen.has(p.id),
    );
    docId = doel.docId;
    paginaId =
      bestaand?.id ??
      (await maakPagina(doel.docId, doel.ouder, naam, String(rij.tekst)));
    // Teruggezet tijdens het maken (andere opname): de pagina hoort niet meer bij deze rij.
    const { changes } = database()
      .prepare(
        `UPDATE notulen SET pagina_doc = ?, pagina_id = ?
         WHERE email = ? AND meeting_id = ? AND stap = 4 AND opname_id IS ?`,
      )
      .run(docId, paginaId, email, meeting.id, verwacht.opnameId);
    if (changes === 0) return;
  }
  let pagina: Pagina | null = null;
  for (let poging = 0; poging < 6; poging++) {
    pagina = await leesPagina(docId, paginaId);
    if (pagina?.link) {
      zetStap(email, meeting.id, 5, verwacht, { pagina_url: pagina.link });
      return;
    }
    await wacht(10_000);
  }
  if (!pagina)
    return zetFout(
      email,
      meeting.id,
      "Pagina niet gevonden in Superhuman",
      verwacht,
    );
  laatLos(email, meeting.id);
}

// ---------- Opname achteraf corrigeren ----------

/**
 * Koppelt een opname aan een meeting (of niets, bij `opnameId` null) en zet de meeting
 * terug om de notulen opnieuw te maken. Een andere meeting die de opname had, raakt hem
 * kwijt. Superhuman-pagina's blijven staan: de volgende run maakt een nieuwe pagina.
 */
export function zetOpname(
  email: string,
  id: string,
  opnameId: string | null,
): boolean {
  const db = database();
  if (!leesRij(email, id)) return false;
  const terug = db.prepare(
    `UPDATE notulen SET opname_id = ?, opname_keuze = ?, stap = ?, sinds = ?,
       pagina_versie = COALESCE(pagina_versie, 0) + (pagina_id IS NOT NULL),
       tekst = NULL, pagina_doc = NULL, pagina_id = NULL, pagina_url = NULL,
       concept_id = NULL, thread_id = NULL, slack_tekst = NULL, slack_ts = NULL,
       gedeeld_url = NULL, niet_gedeeld = NULL, elders = NULL,
       mail_stand = NULL, mail_url = NULL, slack_stand = NULL, slack_url = NULL,
       fout = NULL, bezig = NULL, acties_uit = NULL
     WHERE email = ? AND meeting_id = ?`,
  );
  // De open acties komen opnieuw uit de nieuwe notulen; afgehandelde (to-do, gedaan, genegeerd, herinnerd) blijven staan.
  const actiesWeg = db.prepare(
    "DELETE FROM actiepunten WHERE email = ? AND meeting_id = ? AND status = 'open'",
  );
  db.exec("BEGIN");
  try {
    if (opnameId) {
      const anderen = db
        .prepare(
          "SELECT meeting_id FROM notulen WHERE email = ? AND opname_id = ? AND meeting_id != ?",
        )
        .all(email, opnameId, id);
      for (const andere of anderen) {
        terug.run(null, null, 1, Date.now(), email, String(andere.meeting_id));
        actiesWeg.run(email, String(andere.meeting_id));
      }
    }
    actiesWeg.run(email, id);
    terug.run(
      opnameId,
      opnameId ?? "geen",
      opnameId ? 2 : 1,
      Date.now(),
      email,
      id,
    );
    db.exec("COMMIT");
  } catch (fout) {
    db.exec("ROLLBACK");
    throw fout;
  }
  return true;
}

const recentCache = new Map<
  number,
  { op: number; lijst: Promise<Awaited<ReturnType<typeof recenteOpnames>>> }
>();

/** `plaud recent` met 1 minuut geheugen, want het paneel vraagt het bij elk openen. */
function recentGeheugen(dagen: number) {
  const nu = Date.now();
  const bewaard = recentCache.get(dagen);
  if (bewaard && nu - bewaard.op < 60_000) return bewaard.lijst;
  const lijst = recenteOpnames(dagen);
  recentCache.set(dagen, { op: nu, lijst });
  return lijst;
}

async function infoVan(
  id: string,
  naam: string,
  bezetDoor: string | null,
): Promise<OpnameInfo | { fout: string }> {
  const gelezen = bekend.get(id) ?? (await opnameDetails(id));
  if ("fout" in gelezen) return gelezen;
  bekend.set(id, gelezen);
  return { id, naam, start: gelezen.start, duurMs: gelezen.duurMs, bezetDoor };
}

/** De gekoppelde opname en de opnames rond de dag van de meeting, voor het paneel. */
export async function opnameKeuzes(
  email: string,
  id: string,
): Promise<OpnameKeuzes> {
  const rij = leesRij(email, id);
  if (!rij) return { fout: "Deze meeting is niet gevonden" };
  const dag = lokaal(String(rij.start)).datum;
  const dagen = Math.min(
    30,
    Math.ceil((Date.now() - Date.parse(String(rij.start))) / DAG_MS) + 2,
  );
  const recent = await recentGeheugen(dagen);
  if ("fout" in recent) return recent;
  const titels = new Map(
    database()
      .prepare(
        "SELECT opname_id, titel FROM notulen WHERE email = ? AND opname_id IS NOT NULL AND meeting_id != ?",
      )
      .all(email, id)
      .map((andere) => [String(andere.opname_id), String(andere.titel)]),
  );
  const opties: OpnameInfo[] = [];
  for (const opname of opnamesRondDag(recent, dag)) {
    const info = await infoVan(
      opname.id,
      opname.naam,
      titels.get(opname.id) ?? null,
    );
    if ("fout" in info) return info;
    opties.push(info);
  }
  opties.sort((a, b) => a.start - b.start);
  const opnameId = tekst(rij.opname_id);
  if (!opnameId) return { gekoppeld: null, opties };
  const gekoppeld =
    opties.find((o) => o.id === opnameId) ??
    (await infoVan(opnameId, "Opname in Plaud", null));
  if ("fout" in gekoppeld) return gekoppeld;
  return { gekoppeld, opties };
}

/**
 * Verversen voor één meeting: kijkt opnieuw in Plaud naar de opname, en het
 * transcript als de opname er is. De zware stappen (notulen) lopen daarna zelf door.
 */
export async function ververs(
  email: string,
  id: string,
  platforms: NotulenPlatform[],
): Promise<(() => Promise<void>) | { fout: string }> {
  const rij = leesRij(email, id);
  if (!rij) return { fout: "Deze meeting is niet gevonden" };
  const meetings = await meetingsVoorNotulen(email, platforms, Date.now());
  if ("fout" in meetings) return meetings;
  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) return { fout: "Deze meeting staat niet meer in de agenda" };
  // Een opgeloste fout hoort bij Verversen: opnieuw kijken is precies opnieuw proberen.
  herstelNotulen(email, id);
  await zoekOpnames(email, [meeting], meetings, Date.now());
  return () => verder(email, meeting, platforms);
}
