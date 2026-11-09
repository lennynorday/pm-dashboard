import { TIMEOUT_MS, draaiClaude } from "./claude/run";
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
import { gmailGet } from "./gmail/api";
import { maakConcept } from "./gmail/concept";
import { leesAgenda } from "./google/agenda";
import { NORDAY_DOMEIN } from "./google/oauth";
import type { LinkUrls } from "./links";
import { leesOvergeslagen, leesRegels } from "./meeting-regels";
import {
  type Meeting,
  type PlatformNaam,
  FOCUS,
  PRIVE,
  TEAM,
  alsWoordIn,
  bepaalMeetings,
  lokaal,
  weekVan,
} from "./meetings";
import {
  conceptMail,
  deelKanaal,
  gmailConceptUrl,
  gmailThreadUrl,
  threadStand,
} from "./notulen-delen";
import { type NotulenRij, VASTGELOPEN_MS } from "./notulen-stand";
import {
  type OpnameDetails,
  kiesOpname,
  leesTranscript,
  opnameDetails,
  recenteOpnames,
} from "./plaud";
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
  links: platform.gegevens.links,
  contactpersonen: platform.gegevens.contactpersonen,
});

const DAG_MS = 24 * 60 * 60 * 1000;
// Een run die langer bezig staat dan de time-out van Claude plus marge, is verloren gegaan.
const VERLOREN_MS = TIMEOUT_MS + 60_000;
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
  const conceptId = tekst(rij.concept_id);
  return {
    meetingId: String(rij.meeting_id),
    stap: Number(rij.stap),
    opnameId: tekst(rij.opname_id),
    tekst: tekst(rij.tekst),
    paginaUrl: tekst(rij.pagina_url),
    fout: tekst(rij.fout),
    conceptUrl: conceptId && gmailConceptUrl(email, conceptId),
    slackTekst: tekst(rij.slack_tekst),
    gedeeldUrl: tekst(rij.gedeeld_url),
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

/** Een vastgelopen meeting zoals de inbox hem toont. */
export type VastgelopenMeeting = {
  id: string;
  serieId: string | null;
  titel: string;
  label: string;
  start: string;
  stap: number;
};

/** Geen opname, transcript of gedeelde notulen, 4 uur na de meeting; zonder overgeslagen meetings en series. */
export function leesVastgelopen(email: string): VastgelopenMeeting[] {
  const nu = Date.now();
  return database()
    .prepare(
      `SELECT * FROM notulen n
       WHERE email = ? AND (stap <= 2 OR (stap = 5 AND hoort IS NOT 'prive')) AND fout IS NULL
         AND NOT EXISTS (SELECT 1 FROM meetings_overgeslagen o WHERE o.email = n.email
           AND ((o.soort = 'meeting' AND o.sleutel = n.meeting_id)
             OR (o.soort = 'serie' AND o.sleutel = n.serie_id)))
       ORDER BY start DESC`,
    )
    .all(email)
    .filter((rij) => nu - Date.parse(String(rij.eind)) > VASTGELOPEN_MS)
    .map((rij) => ({
      id: String(rij.meeting_id),
      serieId: tekst(rij.serie_id),
      titel: String(rij.titel),
      label: String(rij.label),
      start: String(rij.start),
      stap: Number(rij.stap),
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

/** Zet de meeting een stap verder; `velden` zijn kolommen uit de vaste lijst hieronder. */
function zetStap(
  email: string,
  id: string,
  stap: number,
  velden: Partial<
    Record<"opname_id" | "tekst" | "pagina_url" | "gedeeld_url", string>
  > = {},
): void {
  database()
    .prepare(
      `UPDATE notulen SET stap = ?, sinds = ?, bezig = NULL, fout = NULL,
         opname_id = COALESCE(?, opname_id), tekst = COALESCE(?, tekst),
         pagina_url = COALESCE(?, pagina_url), gedeeld_url = COALESCE(?, gedeeld_url)
       WHERE email = ? AND meeting_id = ?`,
    )
    .run(
      stap,
      Date.now(),
      velden.opname_id ?? null,
      velden.tekst ?? null,
      velden.pagina_url ?? null,
      velden.gedeeld_url ?? null,
      email,
      id,
    );
}

function zetFout(email: string, id: string, fout: string): void {
  database()
    .prepare(
      "UPDATE notulen SET fout = ?, bezig = NULL WHERE email = ? AND meeting_id = ?",
    )
    .run(fout.slice(0, 500), email, id);
}

/** Claimt de meeting voor een run; false als er al een loopt. */
function claim(email: string, id: string): boolean {
  const nu = Date.now();
  const { changes } = database()
    .prepare(
      `UPDATE notulen SET bezig = ? WHERE email = ? AND meeting_id = ? AND fout IS NULL
         AND (bezig IS NULL OR bezig < ?)`,
    )
    .run(nu, email, id, nu - VERLOREN_MS);
  return changes === 1;
}

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
    meetings.push(
      ...bepaalMeetings(
        agenda.items,
        weken[index],
        platforms,
        regels,
        overgeslagen,
        NORDAY_DOMEIN,
        nu,
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
  if (DEMO || lopend.has(email)) return;
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
        m.hoort !== FOCUS &&
        !m.overgeslagen &&
        m.afgelopen &&
        (Date.parse(m.einde) >= vanaf || bekendeIds.has(m.id)),
    );
    for (const meeting of kandidaten) bewaarMeeting(email, meeting);
    await zoekOpnames(email, kandidaten, nu);
    for (const meeting of kandidaten) {
      await verder(email, meeting, platforms);
    }
  } catch (fout) {
    console.error("Notulen verwerken mislukt:", fout);
  } finally {
    lopend.delete(email);
  }
}

/** Koppelt een opname aan meetings op stap 1 die er in tijd mee overlappen. */
async function zoekOpnames(
  email: string,
  meetings: Meeting[],
  nu: number,
): Promise<void> {
  const zoeken = meetings.filter((m) => {
    const rij = leesRij(email, m.id);
    return rij?.stap === 1 && rij.fout === null;
  });
  if (zoeken.length === 0) return;
  const oudste = Math.min(...zoeken.map((m) => Date.parse(m.start)));
  // Het account is gedeeld: lees niet verder terug dan nodig, en nooit meer dan 14 dagen.
  const dagen = Math.min(14, Math.ceil((nu - oudste) / DAG_MS) + 1);
  const recent = await recenteOpnames(dagen);
  if ("fout" in recent) {
    for (const m of zoeken) zetFout(email, m.id, recent.fout);
    return;
  }
  for (const meeting of zoeken) {
    // Alleen opnames van rond die dag; de datum in de lijst kan in UTC staan.
    const dagen = [
      dagPlus(meeting.datum, -1),
      meeting.datum,
      dagPlus(meeting.datum, 1),
    ];
    const details: OpnameDetails[] = [];
    let fout: string | null = null;
    for (const opname of recent.filter((o) => dagen.includes(o.datum))) {
      const gelezen = bekend.get(opname.id) ?? (await opnameDetails(opname.id));
      if ("fout" in gelezen) {
        fout = gelezen.fout;
        break;
      }
      bekend.set(opname.id, gelezen);
      details.push(gelezen);
    }
    if (fout) {
      zetFout(email, meeting.id, fout);
      continue;
    }
    const gekozen = kiesOpname(
      { start: Date.parse(meeting.start), eind: Date.parse(meeting.einde) },
      details,
    );
    if (gekozen) zetStap(email, meeting.id, 2, { opname_id: gekozen.id });
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
    if ("fout" in details) return zetFout(email, meeting.id, details.fout);
    if (!details.transcript) return;
    zetStap(email, meeting.id, 3);
  }
  if (Number(leesRij(email, meeting.id)?.stap) === 3 && opnameId) {
    if (!claim(email, meeting.id)) return;
    const uitkomst = await maakNotulen(meeting, opnameId);
    if ("fout" in uitkomst) return zetFout(email, meeting.id, uitkomst.fout);
    zetStap(email, meeting.id, 4, { tekst: uitkomst.tekst });
  }
  const klaar = leesRij(email, meeting.id);
  if (Number(klaar?.stap) === 4 && typeof klaar?.tekst === "string") {
    if (!claim(email, meeting.id)) return;
    try {
      await naarSuperhuman(email, meeting, klaar, platforms);
    } catch (fout) {
      zetFout(
        email,
        meeting.id,
        fout instanceof Error ? fout.message : String(fout),
      );
    }
  }
  const gedeeld = leesRij(email, meeting.id);
  if (Number(gedeeld?.stap) === 5 && gedeeld && meeting.hoort !== PRIVE) {
    await bijDelen(email, meeting, gedeeld);
  }
}

/**
 * Extern: kijkt of het concept verstuurd is (een mail met label SENT in de
 * thread) of weggegooid. Intern en Team: laat Claude het Slack-bericht schrijven.
 */
async function bijDelen(email: string, meeting: Meeting, rij: Rij) {
  const threadId = tekst(rij.thread_id);
  if (threadId) {
    // Lukt het lezen niet (Gmail even weg), dan probeert de volgende ronde het opnieuw.
    const thread = await gmailGet(
      email,
      `threads/${threadId}`,
      new URLSearchParams({ format: "minimal" }),
    ).catch(() => undefined);
    if (thread === undefined) return;
    const stand = threadStand(thread);
    if (stand === "verstuurd") {
      return zetStap(email, meeting.id, 6, {
        gedeeld_url: gmailThreadUrl(email, threadId),
      });
    }
    if (stand === "weg") {
      database()
        .prepare(
          "UPDATE notulen SET concept_id = NULL, thread_id = NULL WHERE email = ? AND meeting_id = ? AND thread_id = ?",
        )
        .run(email, meeting.id, threadId);
    }
    return;
  }
  const paginaUrl = tekst(rij.pagina_url);
  const notulen = tekst(rij.tekst);
  if (meeting.extern || rij.slack_tekst !== null || !paginaUrl || !notulen)
    return;
  if (!claim(email, meeting.id)) return;
  const run = await draaiClaude(
    bouwSlackPrompt({ titel: meeting.titel, link: paginaUrl, notulen }),
    SLACK_SYSTEEMPROMPT,
  );
  const bericht =
    "fout" in run ? run : parseSlackBericht(run.stdout, paginaUrl);
  if ("fout" in bericht) return zetFout(email, meeting.id, bericht.fout);
  database()
    .prepare(
      "UPDATE notulen SET slack_tekst = ?, bezig = NULL WHERE email = ? AND meeting_id = ?",
    )
    .run(bericht.tekst, email, meeting.id);
}

// ---------- Delen, na een klik ----------

/** Een meeting die klaarstaat om te delen: in Superhuman en nog niet gedeeld. */
function teDelen(email: string, id: string): Rij | null {
  const rij = leesRij(email, id);
  if (Number(rij?.stap) !== 5 || rij?.hoort === PRIVE) return null;
  return rij ?? null;
}

/**
 * Maakt het Gmail-concept aan de ontvangers met de link naar de notulen en
 * bewaart concept en thread. Verstuurt niets. Geeft de link naar het concept.
 */
export async function zetDeelConcept(
  email: string,
  id: string,
  ontvangers: string[],
  voornaam: string,
): Promise<{ conceptUrl: string } | { fout: string }> {
  const rij = teDelen(email, id);
  const paginaUrl = tekst(rij?.pagina_url);
  if (!rij || rij.extern !== 1 || !paginaUrl)
    return { fout: "Deze meeting staat niet klaar om te delen" };
  const bestaand = tekst(rij.concept_id);
  if (bestaand) return { conceptUrl: gmailConceptUrl(email, bestaand) };
  if (!claim(email, id)) return { fout: "Het concept wordt al gemaakt" };
  try {
    const { berichtId, threadId } = await maakConcept(email, {
      aan: ontvangers,
      ...conceptMail(
        { titel: String(rij.titel), start: String(rij.start) },
        paginaUrl,
        voornaam,
      ),
    });
    database()
      .prepare(
        "UPDATE notulen SET concept_id = ?, thread_id = ? WHERE email = ? AND meeting_id = ?",
      )
      .run(berichtId, threadId, email, id);
    return { conceptUrl: gmailConceptUrl(email, berichtId) };
  } finally {
    laatLos(email, id);
  }
}

/**
 * Plaatst het (aangepaste) bericht onder de naam van de gebruiker in het
 * kanaal van het platform of de Team-serie en zet de stap op klaar.
 */
export async function deelInSlack(
  email: string,
  id: string,
  bericht: string,
  platforms: NotulenPlatform[],
): Promise<{ fout: string } | null> {
  const rij = teDelen(email, id);
  if (!rij || rij.extern !== 0)
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
  if (!claim(email, id)) return { fout: "Het bericht wordt al geplaatst" };
  try {
    const { ts, permalink } = await plaatsBericht(email, doel.kanaal, bericht);
    database()
      .prepare(
        "UPDATE notulen SET slack_ts = ? WHERE email = ? AND meeting_id = ?",
      )
      .run(ts, email, id);
    zetStap(email, id, 6, permalink ? { gedeeld_url: permalink } : {});
    return null;
  } finally {
    laatLos(email, id);
  }
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
  const bestaand = (await leesPaginas(docId)).find(
    (p) => p.parentId === notulen && p.naam === meeting.titel,
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

const wacht = (ms: number) => new Promise((klaar) => setTimeout(klaar, ms));

/**
 * Maakt de subpagina (één keer: het id staat meteen in de database) en wacht
 * op de link, want de API loopt 20 tot 30 seconden achter. Komt de link niet,
 * dan haalt de volgende ronde hem op.
 */
async function naarSuperhuman(
  email: string,
  meeting: Meeting,
  rij: Rij,
  platforms: NotulenPlatform[],
): Promise<void> {
  let docId = tekst(rij.pagina_doc);
  let paginaId = tekst(rij.pagina_id);
  if (!docId || !paginaId) {
    const doel = await bestemming(email, meeting, platforms);
    const naam = paginaNaam(meeting);
    const paginas = doel.paginas ?? (await leesPaginas(doel.docId));
    const bestaand = paginas.find(
      (p) => p.parentId === doel.ouder && p.naam === naam,
    );
    docId = doel.docId;
    paginaId =
      bestaand?.id ??
      (await maakPagina(doel.docId, doel.ouder, naam, String(rij.tekst)));
    database()
      .prepare(
        "UPDATE notulen SET pagina_doc = ?, pagina_id = ? WHERE email = ? AND meeting_id = ?",
      )
      .run(docId, paginaId, email, meeting.id);
  }
  for (let poging = 0; poging < 6; poging++) {
    const pagina = await leesPagina(docId, paginaId);
    if (pagina?.link)
      return zetStap(email, meeting.id, 5, { pagina_url: pagina.link });
    await wacht(10_000);
  }
  laatLos(email, meeting.id);
}
