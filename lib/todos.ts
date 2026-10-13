import { database } from "./db";
import type { SlackTodo } from "./slack/api";
import {
  type FeedTodo,
  type Lijst,
  type Prio,
  type Status,
  type Taak,
  parseBron,
  parseLijst,
  parsePrio,
  parseStatus,
} from "./taak";

function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" ? waarde : null;
}

function parseTaak(row: Record<string, unknown>): Taak | null {
  const status = parseStatus(row.status);
  const prio = parsePrio(row.prio);
  const lijst = parseLijst(row.lijst);
  const bron = parseBron(row.bron);
  if (
    typeof row.id !== "number" ||
    typeof row.titel !== "string" ||
    !status ||
    !prio ||
    !lijst ||
    !bron
  ) {
    return null;
  }
  return {
    id: row.id,
    bron,
    titel: row.titel,
    auteur: tekst(row.auteur),
    plek: tekst(row.plek),
    tijd: typeof row.tijd === "number" ? row.tijd : null,
    url: tekst(row.url),
    bericht: tekst(row.bericht),
    soort: tekst(row.soort),
    lijst,
    status,
    prio,
  };
}

/** Inbox: nieuwste bericht eerst. To-do's: laatst toegevoegd eerst. */
export function leesTaken(email: string, lijst: Lijst): Taak[] {
  return database()
    .prepare(
      `SELECT * FROM taken WHERE email = ? AND lijst = ?
       ORDER BY COALESCE(tijd, toegevoegd / 1000) DESC, id DESC`,
    )
    .all(email, lijst)
    .map(parseTaak)
    .filter((taak): taak is Taak => taak !== null);
}

/** Voor de tellers in het menu: nieuwe inbox-items en open taken. */
export function tellingen(email: string): { inbox: number; open: number } {
  const row = database()
    .prepare(
      `SELECT
         COUNT(*) FILTER (WHERE lijst = 'inbox') AS inbox,
         COUNT(*) FILTER (WHERE lijst = 'todo' AND status != 'klaar') AS open
       FROM taken WHERE email = ?`,
    )
    .get(email);
  return {
    inbox: typeof row?.inbox === "number" ? row.inbox : 0,
    open: typeof row?.open === "number" ? row.open : 0,
  };
}

/**
 * Zet nieuwe Slack-berichten in de inbox; wat al bekend is, blijft zoals het is.
 * Een DM-gesprek is één item (bron_id dm:<kanaal>): een nieuwer bericht werkt het
 * bij en haalt het terug uit genegeerd, op To-do's blijft het ongemoeid. Een
 * item zonder tekst (app-berichten van voor de blocks-ondersteuning) wordt ook bijgewerkt.
 */
export function voegSlackToe(email: string, berichten: SlackTodo[]): void {
  const insert = database().prepare(
    `INSERT INTO taken
       (email, bron, bron_id, titel, bericht, auteur, plek, tijd, url, soort, lijst, toegevoegd)
     VALUES (?, 'slack', ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', ?)
     ON CONFLICT (email, bron, bron_id) DO UPDATE SET
       titel = excluded.titel, bericht = excluded.bericht,
       auteur = excluded.auteur, plek = excluded.plek, tijd = excluded.tijd,
       url = excluded.url, lijst = 'inbox'
     WHERE taken.lijst != 'todo'
       AND (excluded.tijd > taken.tijd OR COALESCE(taken.bericht, '') = '')`,
  );
  for (const bericht of berichten) {
    insert.run(
      email,
      bericht.gesprek ? `dm:${bericht.gesprek}` : bericht.permalink,
      bericht.text,
      bericht.text,
      bericht.auteur,
      bericht.kanaal,
      bericht.tijd,
      bericht.permalink,
      bericht.soort,
      Date.now(),
    );
  }
}

/** Haalt beantwoorde inbox-items uit de inbox, op bron_id (dm:<kanaal> of permalink). */
export function verwijderBeantwoorde(email: string, bronIds: string[]): void {
  const verwijder = database().prepare(
    `DELETE FROM taken
     WHERE email = ? AND bron = 'slack' AND lijst = 'inbox' AND bron_id = ?`,
  );
  for (const bronId of bronIds) verwijder.run(email, bronId);
}

export function nieuweTaak(email: string, titel: string, status: Status): void {
  database()
    .prepare(
      `INSERT INTO taken (email, bron, titel, lijst, status, toegevoegd)
       VALUES (?, 'eigen', ?, 'todo', ?, ?)`,
    )
    .run(email, titel, status, Date.now());
}

export function verplaats(email: string, id: number, lijst: Lijst): void {
  database()
    .prepare("UPDATE taken SET lijst = ? WHERE email = ? AND id = ?")
    .run(lijst, email, id);
}

export function zetStatus(email: string, id: number, status: Status): void {
  database()
    .prepare(
      `UPDATE taken SET status = ?,
         afgerond = CASE WHEN ? = 'klaar' THEN COALESCE(afgerond, ?) END
       WHERE email = ? AND id = ?`,
    )
    .run(status, status, Date.now(), email, id);
}

export function zetPrio(email: string, id: number, prio: Prio): void {
  database()
    .prepare("UPDATE taken SET prio = ? WHERE email = ? AND id = ?")
    .run(prio, email, id);
}

/** Een inbox-item wordt een taak, met de titel die de gebruiker zelf schreef. */
export function naarTodo(
  email: string,
  id: number,
  titel: string,
  prio: Prio,
): void {
  database()
    .prepare(
      "UPDATE taken SET lijst = 'todo', titel = ?, prio = ? WHERE email = ? AND id = ?",
    )
    .run(titel, prio, email, id);
}

export function hernoem(email: string, id: number, titel: string): void {
  database()
    .prepare("UPDATE taken SET titel = ? WHERE email = ? AND id = ?")
    .run(titel, email, id);
}

/** Een melding uit Mijn feed als taak; dezelfde melding wordt niet dubbel toegevoegd. */
export function voegFeedToe(
  email: string,
  melding: FeedTodo,
  titel: string,
  prio: Prio,
): void {
  database()
    .prepare(
      `INSERT OR IGNORE INTO taken
         (email, bron, bron_id, titel, bericht, plek, url, lijst, prio, toegevoegd)
       VALUES (?, 'feed', ?, ?, ?, ?, ?, 'todo', ?, ?)`,
    )
    .run(
      email,
      melding.id,
      titel,
      `${melding.titel}. ${melding.detail}`,
      melding.plek,
      melding.url,
      prio,
      Date.now(),
    );
}

/** Maakt "Naar to-do" op een feedmelding ongedaan. */
export function verwijderFeedTodo(email: string, bronId: string): void {
  database()
    .prepare(
      "DELETE FROM taken WHERE email = ? AND bron = 'feed' AND bron_id = ?",
    )
    .run(email, bronId);
}
