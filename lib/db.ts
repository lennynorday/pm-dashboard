import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const FILE = path.join(process.cwd(), "data", "dashboard.db");

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
    CREATE TABLE IF NOT EXISTS account_gegevens (
      slug TEXT PRIMARY KEY,
      gegevens TEXT NOT NULL
    );
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

/** De database in data/dashboard.db; wordt bij het eerste gebruik aangemaakt. */
export function database(): DatabaseSync {
  store.dashboardDb ??= open();
  return store.dashboardDb;
}
