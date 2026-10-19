import { database } from "./db";
import {
  parseOpdrachtStatus,
  parseSoort,
  type Opdracht,
  type OpdrachtStatus,
  type Soort,
  type Voorstel,
} from "./claude/voorstel";
import { TIMEOUT_MS } from "./claude/run";

// Een run die langer dan de time-out bezig staat, is verloren gegaan (herstart van de server).
const VERLOREN_MS = TIMEOUT_MS + 60_000;

function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" ? waarde : null;
}

function parseOpdracht(row: Record<string, unknown>): Opdracht | null {
  const status = parseOpdrachtStatus(row.status);
  const soort = parseSoort(row.soort);
  if (
    typeof row.id !== "number" ||
    typeof row.taak_id !== "number" ||
    !status ||
    !soort
  ) {
    return null;
  }
  return {
    id: row.id,
    taakId: row.taak_id,
    status,
    soort,
    fout: tekst(row.fout),
    conceptUrl: tekst(row.concept_url),
    voorstel:
      typeof row.tekst === "string"
        ? {
            soort,
            ontvanger: tekst(row.ontvanger),
            onderwerp: tekst(row.onderwerp),
            tekst: row.tekst,
          }
        : null,
  };
}

/**
 * Per taak de nieuwste opdracht die niet is afgewezen, met de nieuwste versie.
 * Opdrachten die bezig zouden zijn maar nooit klaarkwamen, worden eerst mislukt.
 */
export function leesOpdrachten(email: string): Opdracht[] {
  database()
    .prepare(
      `UPDATE opdrachten SET status = 'mislukt', klaar = ?,
         fout = 'De run is onderbroken, probeer het opnieuw'
       WHERE email = ? AND status = 'bezig' AND gestart < ?`,
    )
    .run(Date.now(), email, Date.now() - VERLOREN_MS);
  return database()
    .prepare(
      `SELECT o.*, v.ontvanger, v.onderwerp, v.tekst
       FROM opdrachten o
       LEFT JOIN opdracht_versies v ON v.id =
         (SELECT MAX(id) FROM opdracht_versies WHERE opdracht_id = o.id)
       WHERE o.email = ? AND o.status != 'afgewezen'
         AND o.id = (SELECT MAX(id) FROM opdrachten
                     WHERE taak_id = o.taak_id AND status != 'afgewezen')`,
    )
    .all(email)
    .map(parseOpdracht)
    .filter((opdracht): opdracht is Opdracht => opdracht !== null);
}

/** Een open opdracht is nog niet akkoord of afgewezen. */
const heeftOpen = (taakId: number): boolean =>
  database()
    .prepare(
      `SELECT 1 FROM opdrachten
       WHERE taak_id = ? AND status IN ('bezig', 'voorstel', 'mislukt')`,
    )
    .get(taakId) !== undefined;

/** Nieuwe opdracht met status bezig; null als de taak niet van deze gebruiker is, op Klaar staat of al een open opdracht heeft. */
export function maakOpdracht(
  email: string,
  taakId: number,
  instructie: string,
  soort: Soort,
): number | null {
  const taak = database()
    .prepare(
      "SELECT 1 FROM taken WHERE email = ? AND id = ? AND lijst = 'todo' AND status != 'klaar'",
    )
    .get(email, taakId);
  if (!taak || heeftOpen(taakId)) return null;
  const { lastInsertRowid } = database()
    .prepare(
      `INSERT INTO opdrachten (email, taak_id, instructie, status, soort, gestart)
       VALUES (?, ?, ?, 'bezig', ?, ?)`,
    )
    .run(email, taakId, instructie, soort, Date.now());
  return Number(lastInsertRowid);
}

/** Opnieuw proberen na een mislukte run; true als de opdracht weer bezig is. */
export function herstart(email: string, id: number): boolean {
  const { changes } = database()
    .prepare(
      `UPDATE opdrachten SET status = 'bezig', fout = NULL, klaar = NULL, gestart = ?
       WHERE email = ? AND id = ? AND status = 'mislukt'`,
    )
    .run(Date.now(), email, id);
  return changes === 1;
}

/** De instructie en soort voor een run, zolang de opdracht bezig is. */
export function leesBezig(
  id: number,
): { email: string; taakId: number; instructie: string; soort: Soort } | null {
  const row = database()
    .prepare("SELECT * FROM opdrachten WHERE id = ? AND status = 'bezig'")
    .get(id);
  const soort = parseSoort(row?.soort);
  if (!row || !soort || typeof row.taak_id !== "number") return null;
  return {
    email: String(row.email),
    taakId: row.taak_id,
    instructie: tekst(row.instructie) ?? "",
    soort,
  };
}

/** Bewaart het voorstel als eerste versie en zet de opdracht op voorstel. */
export function rondAf(id: number, voorstel: Voorstel): void {
  const nu = Date.now();
  // Alleen een opdracht die nog bezig is, krijgt een versie (niet na afwijzen of een time-out).
  const { changes } = database()
    .prepare(
      "UPDATE opdrachten SET status = 'voorstel', soort = ?, fout = NULL, klaar = ? WHERE id = ? AND status = 'bezig'",
    )
    .run(voorstel.soort, nu, id);
  if (changes !== 1) return;
  database()
    .prepare(
      `INSERT INTO opdracht_versies (opdracht_id, ontvanger, onderwerp, tekst, aangemaakt)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, voorstel.ontvanger, voorstel.onderwerp, voorstel.tekst, nu);
}

export function markeerMislukt(id: number, fout: string): void {
  database()
    .prepare(
      "UPDATE opdrachten SET status = 'mislukt', fout = ?, klaar = ? WHERE id = ? AND status = 'bezig'",
    )
    .run(fout, Date.now(), id);
}

/** Akkoord; bij een Gmail-concept met de link naar het concept. */
export function zetAkkoord(
  email: string,
  id: number,
  conceptUrl: string | null,
): void {
  database()
    .prepare(
      `UPDATE opdrachten SET status = 'akkoord', concept_url = ?
       WHERE email = ? AND id = ? AND status = 'voorstel'`,
    )
    .run(conceptUrl, email, id);
}

/** Van voorstel naar afgewezen, of terug (Ongedaan maken); raakt de taak niet aan. */
export function zetBesluit(
  email: string,
  id: number,
  van: OpdrachtStatus,
  naar: OpdrachtStatus,
): void {
  database()
    .prepare(
      "UPDATE opdrachten SET status = ? WHERE email = ? AND id = ? AND status = ?",
    )
    .run(naar, email, id, van);
}
