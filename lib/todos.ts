import { database } from "./db";
import type { SlackTodo } from "./slack/saved";
import {
  type Lijst,
  type Prio,
  type Status,
  type Taak,
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
  const bron = row.bron === "slack" || row.bron === "eigen" ? row.bron : null;
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

/** Zet nieuwe bewaarde berichten in de inbox; wat al bekend is, blijft zoals het is. */
export function voegSlackToe(email: string, berichten: SlackTodo[]): void {
  const insert = database().prepare(
    `INSERT OR IGNORE INTO taken
       (email, bron, bron_id, titel, auteur, plek, tijd, url, soort, lijst, toegevoegd)
     VALUES (?, 'slack', ?, ?, ?, ?, ?, ?, 'Bewaard', 'inbox', ?)`,
  );
  for (const bericht of berichten) {
    insert.run(
      email,
      bericht.permalink,
      bericht.text,
      bericht.auteur,
      bericht.kanaal,
      bericht.tijd,
      bericht.permalink,
      Date.now(),
    );
  }
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
    .prepare("UPDATE taken SET status = ? WHERE email = ? AND id = ?")
    .run(status, email, id);
}

export function zetPrio(email: string, id: number, prio: Prio): void {
  database()
    .prepare("UPDATE taken SET prio = ? WHERE email = ? AND id = ?")
    .run(prio, email, id);
}
