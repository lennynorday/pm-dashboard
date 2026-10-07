import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** De desktop-app zet de map op Application Support; anders data/ in de repo. */
const FILE = path.join(
  process.env.PM_DATA_DIR ?? path.join(process.cwd(), "data"),
  "dashboard.db",
);

function open(): DatabaseSync {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const db = new DatabaseSync(FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS gebruikers (
      email TEXT PRIMARY KEY,
      naam TEXT NOT NULL,
      voornaam TEXT NOT NULL,
      foto TEXT
    );
    CREATE TABLE IF NOT EXISTS sessies (
      id_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL REFERENCES gebruikers (email),
      aangemaakt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS koppelingen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      bron TEXT NOT NULL,
      token TEXT NOT NULL,
      PRIMARY KEY (email, bron)
    );
    -- De accountgegevens staan sinds oktober 2026 in Superhuman.
    DROP TABLE IF EXISTS account_gegevens;
    CREATE TABLE IF NOT EXISTS verborgen_projecten (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      nummer TEXT NOT NULL,
      PRIMARY KEY (email, nummer)
    );
    CREATE TABLE IF NOT EXISTS orbit_cache (
      sleutel TEXT PRIMARY KEY,
      waarde TEXT NOT NULL,
      opgehaald INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS genegeerde_meldingen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      id TEXT NOT NULL,
      PRIMARY KEY (email, id)
    );
  `);
  return db;
}

// Eén verbinding, ook als Next.js deze module in dev opnieuw laadt.
const store = globalThis as { dashboardDb?: DatabaseSync };

/** De database dashboard.db; wordt bij het eerste gebruik aangemaakt. */
export function database(): DatabaseSync {
  store.dashboardDb ??= open();
  return store.dashboardDb;
}

/**
 * Cache in de database, zodat een herstart niets weggooit en we bij een
 * rate limit of storing de laatst bekende gegevens kunnen tonen.
 * Ondanks de naam orbit_cache ook voor Superhuman.
 * Verhoog de versie in de sleutel als de vorm van de waarde verandert.
 */
export function lees<T>(
  sleutel: string,
): { waarde: T; opgehaald: number } | null {
  const regel = database()
    .prepare("SELECT waarde, opgehaald FROM orbit_cache WHERE sleutel = ?")
    .get(sleutel);
  if (
    typeof regel?.waarde !== "string" ||
    typeof regel.opgehaald !== "number"
  ) {
    return null;
  }
  return { waarde: JSON.parse(regel.waarde) as T, opgehaald: regel.opgehaald };
}

export function bewaar(
  sleutel: string,
  waarde: unknown,
  opgehaald = Date.now(),
): void {
  database()
    .prepare(
      "INSERT OR REPLACE INTO orbit_cache (sleutel, waarde, opgehaald) VALUES (?, ?, ?)",
    )
    .run(sleutel, JSON.stringify(waarde), opgehaald);
}

export function vers(opgehaald: number, maxMs: number): boolean {
  return Date.now() - opgehaald < maxMs;
}
