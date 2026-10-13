import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// npm run dev (poort 3000) is staging met een eigen kopie; npm run serve (3999) is productie.
const FILE = path.join(
  process.cwd(),
  "data",
  process.env.NODE_ENV === "production" ? "dashboard.db" : "staging.db",
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
    CREATE TABLE IF NOT EXISTS slack_start (
      email TEXT PRIMARY KEY REFERENCES gebruikers (email),
      sinds INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS slack_gebruikers (
      id TEXT PRIMARY KEY,
      naam TEXT NOT NULL,
      opgehaald INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS taken (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL REFERENCES gebruikers (email),
      bron TEXT NOT NULL,
      bron_id TEXT,
      titel TEXT NOT NULL,
      auteur TEXT,
      plek TEXT,
      tijd INTEGER,
      url TEXT,
      soort TEXT,
      bericht TEXT,
      lijst TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'niet-gestart',
      prio INTEGER NOT NULL DEFAULT 3,
      toegevoegd INTEGER NOT NULL,
      UNIQUE (email, bron, bron_id)
    );
  `);
  // De kolom bericht kwam later: de tekst van het oorspronkelijke Slack-bericht, naast de eigen titel.
  const kolommen = db.prepare("PRAGMA table_info(taken)").all();
  if (!kolommen.some((kolom) => kolom.name === "bericht")) {
    db.exec(`
      ALTER TABLE taken ADD COLUMN bericht TEXT;
      UPDATE taken SET bericht = titel WHERE bron = 'slack';
    `);
  }
  // Wanneer een taak op klaar ging (ms), voor de urenanalyse; leeg zolang hij niet klaar is.
  if (!kolommen.some((kolom) => kolom.name === "afgerond")) {
    db.exec("ALTER TABLE taken ADD COLUMN afgerond INTEGER");
  }
  // Of een Slack-gebruiker een app is (Jira, Google Calendar); leeg = nog niet opgehaald.
  const gebruikerKolommen = db
    .prepare("PRAGMA table_info(slack_gebruikers)")
    .all();
  if (!gebruikerKolommen.some((kolom) => kolom.name === "bot")) {
    db.exec("ALTER TABLE slack_gebruikers ADD COLUMN bot INTEGER");
  }
  // DM's werden per bericht bewaard; nu is een gesprek één item (bron_id dm:<kanaal>).
  // Inbox-items maakt de sync opnieuw aan, de rest krijgt de nieuwe sleutel.
  const oudeDms = `bron = 'slack' AND soort = 'Direct bericht' AND bron_id NOT LIKE 'dm:%'`;
  db.exec(`DELETE FROM taken WHERE lijst = 'inbox' AND ${oudeDms}`);
  const omzetten = db.prepare(
    "UPDATE OR IGNORE taken SET bron_id = ? WHERE id = ?",
  );
  for (const rij of db
    .prepare(`SELECT id, bron_id FROM taken WHERE ${oudeDms}`)
    .all()) {
    const kanaal = String(rij.bron_id).split("/archives/")[1]?.split("/")[0];
    if (kanaal) omzetten.run(`dm:${kanaal}`, Number(rij.id));
  }
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
