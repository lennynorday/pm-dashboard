import {
  type Actiepunt,
  type ActieStatus,
  type SlackPersoon,
  inFeed,
  isExtern,
  isIedereen,
  isVanMij,
  kandidaten,
  koppelNaam,
  leesActies,
  nieuweActies,
  parseActieStatus,
} from "./actiepunt";
import { draaiClaude } from "./claude/run";
import {
  SLACK_SYSTEEMPROMPT,
  bouwHerinnerPrompt,
  parseHerinnering,
} from "./claude/notulen";
import { database } from "./db";
import { isNetwerkFout } from "./notulen-delen";
import { stuurDm } from "./slack/api";
import { slackPersonen } from "./slack/namen";
import type { Prio } from "./taak";
import { voegActieToe } from "./todos";

const tekst = (waarde: unknown) => (typeof waarde === "string" ? waarde : null);

/**
 * Haalt de acties uit notulen met akkoord die nog niet uitgelezen zijn. Elke notulen maar
 * één keer (acties_uit), en een actie maar één keer (zelfde eigenaar en wat per meeting).
 */
export function haalActiesUit(email: string): void {
  const db = database();
  const rijen = db
    .prepare(
      "SELECT meeting_id, tekst FROM notulen WHERE email = ? AND tekst IS NOT NULL AND akkoord IS NOT NULL AND acties_uit IS NULL",
    )
    .all(email);
  const voegToe = db.prepare(
    `INSERT OR IGNORE INTO actiepunten (email, meeting_id, volgnummer, eigenaar, wat, onderwerp)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const klaar = db.prepare(
    "UPDATE notulen SET acties_uit = ? WHERE email = ? AND meeting_id = ?",
  );
  // Na opnieuw notulen maken staan de afgehandelde acties er nog; die komen er niet dubbel bij.
  const bestaand = db.prepare(
    "SELECT eigenaar, wat, volgnummer FROM actiepunten WHERE email = ? AND meeting_id = ?",
  );
  for (const rij of rijen) {
    const id = String(rij.meeting_id);
    db.exec("BEGIN");
    try {
      const al = bestaand.all(email, id).map((actie) => ({
        eigenaar: String(actie.eigenaar),
        wat: String(actie.wat),
        volgnummer: Number(actie.volgnummer),
      }));
      for (const actie of nieuweActies(leesActies(String(rij.tekst)), al))
        voegToe.run(
          email,
          id,
          actie.volgnummer,
          actie.eigenaar,
          actie.wat,
          actie.onderwerp,
        );
      klaar.run(Date.now(), email, id);
      db.exec("COMMIT");
    } catch (fout) {
      db.exec("ROLLBACK");
      throw fout;
    }
  }
}

type Leden = { personen: SlackPersoon[] | null; gekozen: Set<string> };

const naamSleutel = (naam: string) => naam.trim().toLowerCase();

/** De bewaarde Slack-leden en de namen die de gebruiker zelf aan Slack koppelde; null personen = nog niet opgehaald. */
function leesLeden(email: string): Leden {
  const db = database();
  const personen = db
    .prepare(
      "SELECT id, naam FROM slack_leden WHERE email = ? ORDER BY naam COLLATE NOCASE",
    )
    .all(email)
    .map((rij) => ({ id: String(rij.id), naam: String(rij.naam) }));
  const gekozen = db
    .prepare("SELECT naam FROM slack_namen WHERE email = ?")
    .all(email)
    .map((rij) => String(rij.naam));
  return {
    personen: personen.length > 0 ? personen : null,
    gekozen: new Set(gekozen),
  };
}

const LEDEN_VERS = 60 * 60 * 1000;
const opgehaald = new Map<string, number>();

/** Haalt de Slack-leden hooguit elk uur op en bewaart ze; zonder Slack-koppeling blijft alles zoals het was. */
export async function ververLeden(email: string): Promise<void> {
  if (Date.now() - (opgehaald.get(email) ?? 0) < LEDEN_VERS) return;
  opgehaald.set(email, Date.now());
  try {
    const personen = await slackPersonen(email);
    if (personen.length === 0) return;
    const db = database();
    const voegToe = db.prepare(
      "INSERT INTO slack_leden (email, id, naam) VALUES (?, ?, ?)",
    );
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM slack_leden WHERE email = ?").run(email);
      for (const p of personen) voegToe.run(email, p.id, p.naam);
      db.exec("COMMIT");
    } catch (fout) {
      db.exec("ROLLBACK");
      throw fout;
    }
  } catch {
    // Geen Slack of een rate limit: de vorige lijst blijft staan.
    opgehaald.delete(email);
  }
}

/** De Slack-leden uit de database, hooguit elk uur ververst, in plaats van bij elke herinnering users.list. */
async function bewaardeLeden(email: string): Promise<SlackPersoon[]> {
  await ververLeden(email);
  return leesLeden(email).personen ?? [];
}

function parseActiepunt(
  rij: Record<string, unknown>,
  voornaam: string,
  leden: Leden = { personen: null, gekozen: new Set() },
): Actiepunt | null {
  const status = parseActieStatus(rij.status);
  if (!status || typeof rij.id !== "number") return null;
  const eigenaar = String(rij.eigenaar);
  const vanMij = isVanMij(eigenaar, voornaam);
  const extern =
    !vanMij &&
    !leden.gekozen.has(naamSleutel(eigenaar)) &&
    isExtern(eigenaar, leden.personen);
  return {
    id: rij.id,
    meetingId: String(rij.meeting_id),
    eigenaar,
    wat: String(rij.wat),
    onderwerp: tekst(rij.onderwerp),
    meeting: String(rij.titel),
    label: String(rij.label),
    start: String(rij.start),
    paginaUrl: tekst(rij.pagina_url),
    status,
    herinnerd: typeof rij.herinnerd === "number" ? rij.herinnerd : null,
    vanMij,
    extern,
    teHerinneren: !vanMij && !extern && !isIedereen(eigenaar),
  };
}

const SELECT = `SELECT a.*, n.titel, n.label, n.start, n.pagina_url
  FROM actiepunten a JOIN notulen n ON n.email = a.email AND n.meeting_id = a.meeting_id`;

/** De actiepunten in de feed (open of herinnerd), nieuwste meeting eerst. */
export function leesFeed(email: string, voornaam: string): Actiepunt[] {
  const leden = leesLeden(email);
  return database()
    .prepare(
      `${SELECT} WHERE a.email = ? AND a.status IN ('open', 'herinnerd')
       ORDER BY n.start DESC, a.volgnummer`,
    )
    .all(email)
    .map((rij) => parseActiepunt(rij, voornaam, leden))
    .filter((actie): actie is Actiepunt => actie !== null);
}

/** Alle actiepunten van deze meetings, met elke status, voor de overlay. */
export function leesVanMeetings(
  email: string,
  voornaam: string,
  ids: string[],
): Actiepunt[] {
  const leden = leesLeden(email);
  return database()
    .prepare(
      `${SELECT} WHERE a.email = ? AND a.meeting_id IN (SELECT value FROM json_each(?))
       ORDER BY a.volgnummer`,
    )
    .all(email, JSON.stringify(ids))
    .map((rij) => parseActiepunt(rij, voornaam, leden))
    .filter((actie): actie is Actiepunt => actie !== null);
}

/** Voor de teller in het zijmenu: de open acties van de gebruiker zelf. */
export const openVanMij = (email: string, voornaam: string) =>
  leesFeed(email, voornaam).filter(
    (actie) => actie.vanMij && actie.status === "open",
  ).length;

function leesActie(email: string, id: number) {
  return database()
    .prepare("SELECT * FROM actiepunten WHERE email = ? AND id = ?")
    .get(email, id);
}

/**
 * Gedaan, genegeerd of terug in de feed (ongedaan maken). Terug wordt open,
 * of herinnerd als er al een herinnering ging; een to-do ervan gaat weg.
 */
export function zetActieStatus(
  email: string,
  id: number,
  status: "gedaan" | "genegeerd" | "terug",
): void {
  const rij = leesActie(email, id);
  if (!rij) return;
  if (status !== "terug") {
    if (!inFeed(parseActieStatus(rij.status) ?? "open")) return;
    database()
      .prepare("UPDATE actiepunten SET status = ? WHERE email = ? AND id = ?")
      .run(status, email, id);
    return;
  }
  if (typeof rij.taak_id === "number") {
    database()
      .prepare("DELETE FROM taken WHERE email = ? AND id = ?")
      .run(email, rij.taak_id);
  }
  const terug: ActieStatus = rij.herinnerd === null ? "open" : "herinnerd";
  database()
    .prepare(
      "UPDATE actiepunten SET status = ?, taak_id = NULL WHERE email = ? AND id = ?",
    )
    .run(terug, email, id);
}

/** Maakt een to-do van een open actie, met de titel en prio uit de popup. */
export function actieNaarTodo(
  email: string,
  voornaam: string,
  id: number,
  titel: string,
  prio: Prio,
): void {
  const actie = leesVanId(email, voornaam, id);
  if (!actie) return;
  // Eerst de status: bij een dubbele klik komt er maar één to-do.
  const { changes } = database()
    .prepare(
      "UPDATE actiepunten SET status = 'todo' WHERE email = ? AND id = ? AND status = 'open'",
    )
    .run(email, id);
  if (changes !== 1) return;
  const taakId = voegActieToe(email, titel, prio, {
    bericht: actie.wat,
    plek: actie.label,
    url: actie.paginaUrl,
  });
  database()
    .prepare("UPDATE actiepunten SET taak_id = ? WHERE email = ? AND id = ?")
    .run(taakId, email, id);
}

function leesVanId(email: string, voornaam: string, id: number) {
  const rij = database()
    .prepare(`${SELECT} WHERE a.email = ? AND a.id = ?`)
    .get(email, id);
  return rij ? parseActiepunt(rij, voornaam, leesLeden(email)) : null;
}

/** De gekozen of gevonden Slack-gebruiker bij de eigenaar; null als het niet eenduidig is. */
function persoonVan(
  email: string,
  eigenaar: string,
  personen: SlackPersoon[],
): SlackPersoon | null {
  const gekozen = database()
    .prepare("SELECT slack_id FROM slack_namen WHERE email = ? AND naam = ?")
    .get(email, naamSleutel(eigenaar));
  const bewaard = personen.find((p) => p.id === gekozen?.slack_id);
  return bewaard ?? koppelNaam(eigenaar, personen);
}

export type HerinnerVoorstel =
  | { soort: "kiezen"; personen: SlackPersoon[] }
  | {
      soort: "bericht";
      persoon: SlackPersoon;
      tekst: string;
      /** Voor "Andere persoon". */
      personen: SlackPersoon[];
    }
  | { soort: "fout"; fout: string };

/**
 * Het bericht voor "Herinner": eerst de Slack-gebruiker bij de naam (of de
 * keuze die de gebruiker nu maakt, die wordt onthouden), dan de tekst die
 * Claude schreef. De tekst wordt bewaard, zodat Claude maar één keer schrijft.
 */
export async function herinnerVoorstel(
  email: string,
  voornaam: string,
  id: number,
  gekozen: string | null,
): Promise<HerinnerVoorstel> {
  const actie = leesVanId(email, voornaam, id);
  if (!actie?.teHerinneren || !inFeed(actie.status))
    return { soort: "fout", fout: "Deze actie staat niet meer open" };
  const personen = await bewaardeLeden(email);
  if (personen.length === 0)
    return { soort: "fout", fout: "De Slack-leden zijn niet op te halen" };
  const keuze = personen.find((p) => p.id === gekozen);
  if (keuze) {
    // Een (andere) persoon gekozen: de koppeling vervangt de vorige, en Claude schrijft opnieuw.
    database()
      .prepare(
        "INSERT OR REPLACE INTO slack_namen (email, naam, slack_id) VALUES (?, ?, ?)",
      )
      .run(email, naamSleutel(actie.eigenaar), keuze.id);
    database()
      .prepare(
        "UPDATE actiepunten SET herinner_tekst = NULL WHERE email = ? AND id = ?",
      )
      .run(email, id);
  }
  // Bij een groep ("Theo en Kim") kies je uit de collega's in de groep.
  const keuzes = kandidaten(actie.eigenaar, personen);
  const persoon = keuze ?? persoonVan(email, actie.eigenaar, personen);
  if (!persoon) return { soort: "kiezen", personen: keuzes };
  const bewaard = tekst(leesActie(email, id)?.herinner_tekst);
  if (bewaard)
    return { soort: "bericht", persoon, tekst: bewaard, personen: keuzes };
  const run = await draaiClaude(
    bouwHerinnerPrompt({
      voornaam: persoon.naam.split(" ")[0],
      wat: actie.wat,
      meeting: actie.meeting,
      onderwerp: actie.onderwerp,
    }),
    SLACK_SYSTEEMPROMPT,
  );
  const bericht = "fout" in run ? run : parseHerinnering(run.stdout);
  if ("fout" in bericht) return { soort: "fout", fout: bericht.fout };
  database()
    .prepare(
      "UPDATE actiepunten SET herinner_tekst = ? WHERE email = ? AND id = ?",
    )
    .run(bericht.tekst, email, id);
  return { soort: "bericht", persoon, tekst: bericht.tekst, personen: keuzes };
}

const versturen = new Set<number>();

/** Stuurt de (aangepaste) herinnering als DM onder de naam van de gebruiker. Alleen na een klik op Verstuur. */
export async function herinner(
  email: string,
  voornaam: string,
  id: number,
  bericht: string,
): Promise<{ fout: string } | null> {
  const actie = leesVanId(email, voornaam, id);
  if (!actie?.teHerinneren || !inFeed(actie.status))
    return { fout: "Deze actie staat niet meer open" };
  const persoon = persoonVan(email, actie.eigenaar, await bewaardeLeden(email));
  if (!persoon) return { fout: `Kies eerst wie ${actie.eigenaar} is in Slack` };
  // Tegen een dubbele klik: één DM tegelijk per actie.
  if (versturen.has(id)) return { fout: "Het bericht wordt al verstuurd" };
  versturen.add(id);
  const herinnerd = database().prepare(
    "UPDATE actiepunten SET status = 'herinnerd', herinnerd = ?, herinner_tekst = ? WHERE email = ? AND id = ?",
  );
  try {
    await stuurDm(email, persoon.id, bericht);
  } catch (fout) {
    if (!isNetwerkFout(fout)) throw fout;
    // Misschien is de DM toch aangekomen: op herinnerd, zodat er niet zomaar een tweede gaat.
    herinnerd.run(Date.now(), bericht, email, id);
    return {
      fout: `Onzeker of het bericht is verstuurd. Kijk in Slack bij je DM met ${persoon.naam}.`,
    };
  } finally {
    versturen.delete(id);
  }
  herinnerd.run(Date.now(), bericht, email, id);
  return null;
}
