import { database } from "./db";
import {
  parseOpdrachtStatus,
  parseSoort,
  type Opdracht,
  type OpdrachtStatus,
  type Soort,
  type Versie,
  type Voorstel,
} from "./claude/voorstel";
import { TIMEOUT_MS } from "./claude/run";

// Een run die langer dan de time-out bezig staat, is verloren gegaan (herstart van de server).
const VERLOREN_MS = TIMEOUT_MS + 60_000;

function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" ? waarde : null;
}

function parseOpdracht(
  row: Record<string, unknown>,
  versies: Versie[],
): Opdracht | null {
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
    versies,
    voorstel: versies.at(-1) ?? null,
  };
}

/**
 * Per taak de nieuwste opdracht die niet is afgewezen, met alle versies.
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
  const rijen = database()
    .prepare(
      `SELECT o.* FROM opdrachten o
       WHERE o.email = ? AND o.status != 'afgewezen'
         AND o.id = (SELECT MAX(id) FROM opdrachten
                     WHERE taak_id = o.taak_id AND status != 'afgewezen')`,
    )
    .all(email);
  const versies = database().prepare(
    "SELECT * FROM opdracht_versies WHERE opdracht_id = ? ORDER BY id",
  );
  return rijen
    .map((rij) =>
      parseOpdracht(
        rij,
        versies.all(Number(rij.id)).flatMap((v): Versie[] =>
          typeof v.tekst !== "string"
            ? []
            : [
                {
                  soort: parseSoort(rij.soort) ?? "advies",
                  ontvanger: tekst(v.ontvanger),
                  onderwerp: tekst(v.onderwerp),
                  tekst: v.tekst,
                  feedback: tekst(v.feedback),
                },
              ],
        ),
      ),
    )
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

/** Wat een run nodig heeft, zolang de opdracht bezig is; `vorige` en `feedback` alleen bij een aanpassing. */
export function leesBezig(id: number): {
  email: string;
  taakId: number;
  instructie: string;
  soort: Soort;
  vorige: { tekst: string; feedback: string } | null;
} | null {
  const row = database()
    .prepare("SELECT * FROM opdrachten WHERE id = ? AND status = 'bezig'")
    .get(id);
  const soort = parseSoort(row?.soort);
  if (!row || !soort || typeof row.taak_id !== "number") return null;
  const laatste = database()
    .prepare(
      "SELECT tekst FROM opdracht_versies WHERE opdracht_id = ? ORDER BY id DESC LIMIT 1",
    )
    .get(id);
  const feedback = tekst(row.feedback);
  return {
    email: String(row.email),
    taakId: row.taak_id,
    instructie: tekst(row.instructie) ?? "",
    soort,
    vorige:
      feedback && typeof laatste?.tekst === "string"
        ? { tekst: laatste.tekst, feedback }
        : null,
  };
}

/** Aanpassen: het voorstel gaat terug naar bezig, met de feedback voor de nieuwe versie. True als dat gelukt is. */
export function startAanpassing(
  email: string,
  id: number,
  feedback: string,
): boolean {
  const { changes } = database()
    .prepare(
      `UPDATE opdrachten SET status = 'bezig', feedback = ?, fout = NULL, klaar = NULL, gestart = ?
       WHERE email = ? AND id = ? AND status = 'voorstel'`,
    )
    .run(feedback, Date.now(), email, id);
  return changes === 1;
}

/** Bewaart het voorstel als nieuwe versie (met de feedback die ertoe leidde) en zet de opdracht op voorstel. */
export function rondAf(
  id: number,
  voorstel: Voorstel,
  feedback: string | null,
): void {
  const nu = Date.now();
  // Alleen een opdracht die nog bezig is, krijgt een versie (niet na afwijzen of een time-out).
  const { changes } = database()
    .prepare(
      "UPDATE opdrachten SET status = 'voorstel', soort = ?, fout = NULL, feedback = NULL, klaar = ? WHERE id = ? AND status = 'bezig'",
    )
    .run(voorstel.soort, nu, id);
  if (changes !== 1) return;
  database()
    .prepare(
      `INSERT INTO opdracht_versies (opdracht_id, ontvanger, onderwerp, tekst, feedback, aangemaakt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      voorstel.ontvanger,
      voorstel.onderwerp,
      voorstel.tekst,
      feedback,
      nu,
    );
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
