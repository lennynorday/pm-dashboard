import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEMO, vulDemo } from "./demo";

// npm run dev (poort 3000) is staging met een eigen kopie; npm run serve (3999) is productie;
// npm run demo heeft alleen nepdata.
const FILE = path.join(
  process.cwd(),
  "data",
  DEMO
    ? "demo.db"
    : process.env.NODE_ENV === "production"
      ? "dashboard.db"
      : "staging.db",
);

function open(): DatabaseSync {
  mkdirSync(path.dirname(FILE), { recursive: true });
  // Wacht even als de MCP-server en de app tegelijk schrijven, in plaats van "database is locked".
  const db = new DatabaseSync(FILE, { timeout: 5000 });
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
    -- Favorieten zijn in oktober 2026 vervallen.
    DROP TABLE IF EXISTS favorieten;
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
    CREATE TABLE IF NOT EXISTS gmail_start (
      email TEXT PRIMARY KEY REFERENCES gebruikers (email),
      sinds INTEGER NOT NULL
    );
    -- Een rij = die bron staat uit in de Inbox van deze gebruiker.
    CREATE TABLE IF NOT EXISTS inbox_uit (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      bron TEXT NOT NULL,
      PRIMARY KEY (email, bron)
    );
    CREATE TABLE IF NOT EXISTS gmail_uitgesloten (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      waarde TEXT NOT NULL,
      soort TEXT NOT NULL,
      PRIMARY KEY (email, waarde)
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
    -- Uitzetten bij Claude: een opdracht hoort bij één taak en heeft één of meer versies.
    CREATE TABLE IF NOT EXISTS opdrachten (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL REFERENCES gebruikers (email),
      taak_id INTEGER NOT NULL REFERENCES taken (id) ON DELETE CASCADE,
      instructie TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      soort TEXT NOT NULL,
      fout TEXT,
      gestart INTEGER NOT NULL,
      klaar INTEGER
    );
    CREATE TABLE IF NOT EXISTS opdracht_versies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opdracht_id INTEGER NOT NULL REFERENCES opdrachten (id) ON DELETE CASCADE,
      ontvanger TEXT,
      onderwerp TEXT,
      tekst TEXT NOT NULL,
      feedback TEXT,
      aangemaakt INTEGER NOT NULL
    );
    -- Meetings: waar een meeting, serie of titelwoord bij hoort (platform-slug, team of prive).
    -- vanaf: een serieregel geldt vanaf die start (ms); kanaal: het Slack-kanaal van een Team-serie.
    CREATE TABLE IF NOT EXISTS meeting_regels (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      soort TEXT NOT NULL,
      sleutel TEXT NOT NULL,
      doel TEXT NOT NULL,
      titel TEXT NOT NULL,
      vanaf INTEGER,
      kanaal TEXT,
      PRIMARY KEY (email, soort, sleutel)
    );
    -- Meetings en series zonder notulen.
    CREATE TABLE IF NOT EXISTS meetings_overgeslagen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      soort TEXT NOT NULL,
      sleutel TEXT NOT NULL,
      titel TEXT NOT NULL,
      PRIMARY KEY (email, soort, sleutel)
    );
    -- Notulen: waar een afgelopen meeting in de flow staat. stap = aantal afgeronde stappen
    -- (1 wacht op opname, 2 op transcript, 3 notulen maken, 4 naar Superhuman, 5 in Superhuman, 6 gedeeld).
    -- acties_uit: wanneer (ms) de actiepunten uit de notulen zijn gehaald.
    -- bezig: sinds wanneer (ms) een run aan deze meeting werkt, tegen dubbele runs.
    -- Delen: extern een mail (mail_stand, mail_url = de thread in Gmail) en Slack, intern en Team alleen
    -- Slack (slack_tekst van Claude, slack_ts, slack_stand, slack_url). Een stand is 'verstuurd' of
    -- 'overgeslagen'; leeg = nog te doen. concept_id, thread_id en gedeeld_url zijn van de oude flow
    -- met een Gmail-concept en worden niet meer gebruikt.
    -- niet_gedeeld: wanneer (ms) de gebruiker koos om niet te delen; Gedeeld telt dan als afgerond.
    -- elders: wanneer (ms) de gebruiker aangaf dat het al elders gedeeld is.
    CREATE TABLE IF NOT EXISTS notulen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      meeting_id TEXT NOT NULL,
      serie_id TEXT,
      titel TEXT NOT NULL,
      label TEXT NOT NULL,
      hoort TEXT,
      extern INTEGER,
      start TEXT NOT NULL,
      eind TEXT NOT NULL,
      stap INTEGER NOT NULL,
      sinds INTEGER NOT NULL,
      opname_id TEXT,
      tekst TEXT,
      pagina_doc TEXT,
      pagina_id TEXT,
      pagina_url TEXT,
      concept_id TEXT,
      thread_id TEXT,
      slack_tekst TEXT,
      slack_ts TEXT,
      gedeeld_url TEXT,
      niet_gedeeld INTEGER,
      mail_stand TEXT,
      mail_url TEXT,
      slack_stand TEXT,
      slack_url TEXT,
      elders INTEGER,
      fout TEXT,
      bezig INTEGER,
      acties_uit INTEGER,
      PRIMARY KEY (email, meeting_id)
    );
    -- Actiepunten uit de notulen (**Actie Naam:** wat), per meeting genummerd in volgorde.
    -- status: open, herinnerd, todo, gedaan of genegeerd; herinnerd = wanneer (ms) de DM ging;
    -- herinner_tekst = de DM die Claude schreef; taak_id = de to-do die ervan gemaakt is.
    CREATE TABLE IF NOT EXISTS actiepunten (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL REFERENCES gebruikers (email),
      meeting_id TEXT NOT NULL,
      volgnummer INTEGER NOT NULL,
      eigenaar TEXT NOT NULL,
      wat TEXT NOT NULL,
      onderwerp TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      herinnerd INTEGER,
      herinner_tekst TEXT,
      taak_id INTEGER,
      UNIQUE (email, meeting_id, volgnummer)
    );
    -- Per naam uit de notulen de Slack-gebruiker die de gebruiker koos.
    CREATE TABLE IF NOT EXISTS slack_namen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      naam TEXT NOT NULL,
      slack_id TEXT NOT NULL,
      PRIMARY KEY (email, naam)
    );
    -- De Slack-leden bij de laatste keer ophalen: wie hier niet in staat is extern.
    CREATE TABLE IF NOT EXISTS slack_leden (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      id TEXT NOT NULL,
      naam TEXT NOT NULL,
      PRIMARY KEY (email, id)
    );
    -- Vanaf wanneer (ms) het dashboard notulen maakt; eerdere meetings doen niet mee.
    CREATE TABLE IF NOT EXISTS notulen_start (
      email TEXT PRIMARY KEY REFERENCES gebruikers (email),
      vanaf INTEGER NOT NULL
    );
    -- Per reeks de subpagina onder Notulen in Lennys Dashboard.
    CREATE TABLE IF NOT EXISTS notulen_reeksen (
      email TEXT NOT NULL REFERENCES gebruikers (email),
      serie_id TEXT NOT NULL,
      pagina_id TEXT NOT NULL,
      PRIMARY KEY (email, serie_id)
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
  // E-mailadres van de afzender van een Gmail-gesprek, voor de uitsluitlijst.
  if (!kolommen.some((kolom) => kolom.name === "afzender")) {
    db.exec("ALTER TABLE taken ADD COLUMN afzender TEXT");
  }
  // Eigen volgorde op het kanbanbord (laag = boven); leeg = nog niet verplaatst, dus bovenaan.
  if (!kolommen.some((kolom) => kolom.name === "positie")) {
    db.exec("ALTER TABLE taken ADD COLUMN positie INTEGER");
  }
  // Tijd van een nieuwe reactie op een to-do die je nog niet hebt gezien; leeg = niets nieuws.
  if (!kolommen.some((kolom) => kolom.name === "reactie")) {
    db.exec("ALTER TABLE taken ADD COLUMN reactie INTEGER");
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
  // DM-to-do's zijn losgekoppeld van het gesprek (bron_id dm:<kanaal>:<tijd>).
  db.exec(`UPDATE OR IGNORE taken SET bron_id = bron_id || ':' || tijd
    WHERE bron = 'slack' AND lijst = 'todo'
      AND bron_id LIKE 'dm:%' AND bron_id NOT LIKE 'dm:%:%'`);
  // Slack-links met ?thread_ts gaven dubbele items; de sleutel is nu de link zonder query.
  // Inbox-items maakt de sync opnieuw aan, de rest krijgt de nieuwe sleutel.
  const metQuery = `bron = 'slack' AND bron_id LIKE 'https://%?%'`;
  db.exec(`DELETE FROM taken WHERE lijst = 'inbox' AND ${metQuery}`);
  db.exec(`UPDATE OR IGNORE taken SET bron_id = substr(bron_id, 1, instr(bron_id, '?') - 1)
    WHERE ${metQuery}`);
  // Een bewaard DM-bericht stond los naast zijn gesprek; nu valt het onder het gesprek.
  db.exec(`DELETE FROM taken AS los WHERE lijst = 'inbox' AND bron = 'slack'
    AND bron_id LIKE 'https://%/archives/%' AND EXISTS (
      SELECT 1 FROM taken AS gesprek
      WHERE gesprek.email = los.email AND gesprek.lijst = 'inbox'
        AND gesprek.bron_id = 'dm:' || substr(
          substr(los.bron_id, instr(los.bron_id, '/archives/') + 10), 1,
          instr(substr(los.bron_id, instr(los.bron_id, '/archives/') + 10), '/') - 1))`);
  // De link naar het Gmail-concept dat Akkoord klaarzette.
  const opdrachtKolommen = db.prepare("PRAGMA table_info(opdrachten)").all();
  if (!opdrachtKolommen.some((kolom) => kolom.name === "concept_url")) {
    db.exec("ALTER TABLE opdrachten ADD COLUMN concept_url TEXT");
  }
  // Feedback die nog in een nieuwe versie moet worden verwerkt; leeg als Claude niet bezig is met een aanpassing.
  if (!opdrachtKolommen.some((kolom) => kolom.name === "feedback")) {
    db.exec("ALTER TABLE opdrachten ADD COLUMN feedback TEXT");
  }
  // Handmatige opnamekeuze: leeg = automatisch, 'geen' = geen opname, anders het gekozen opname-id.
  // pagina_versie telt hoe vaak de notulen opnieuw zijn gemaakt na een andere opname; elke versie krijgt een eigen Superhuman-pagina.
  const notulenKolommen = db.prepare("PRAGMA table_info(notulen)").all();
  if (!notulenKolommen.some((kolom) => kolom.name === "opname_keuze")) {
    db.exec(`
      ALTER TABLE notulen ADD COLUMN opname_keuze TEXT;
      ALTER TABLE notulen ADD COLUMN pagina_versie INTEGER;
    `);
  }
  // Delen per onderdeel (mail, Slack); eerder gedeelde meetings krijgen hun onderdeel op verstuurd.
  if (
    !db
      .prepare("PRAGMA table_info(notulen)")
      .all()
      .some((kolom) => kolom.name === "mail_stand")
  ) {
    db.exec(`
      ALTER TABLE notulen ADD COLUMN mail_stand TEXT;
      ALTER TABLE notulen ADD COLUMN mail_url TEXT;
      ALTER TABLE notulen ADD COLUMN slack_stand TEXT;
      ALTER TABLE notulen ADD COLUMN slack_url TEXT;
      ALTER TABLE notulen ADD COLUMN elders INTEGER;
      UPDATE notulen SET mail_stand = 'verstuurd', mail_url = gedeeld_url
        WHERE extern = 1 AND stap >= 6 AND niet_gedeeld IS NULL AND gedeeld_url IS NOT NULL;
      UPDATE notulen SET slack_stand = 'verstuurd', slack_url = gedeeld_url
        WHERE extern = 0 AND stap >= 6 AND niet_gedeeld IS NULL AND gedeeld_url IS NOT NULL;
    `);
  }
  // Series werden bewaard met Google's "_R<datum>" van een aangepaste reeks; nu zonder.
  for (const tabel of ["meeting_regels", "meetings_overgeslagen"]) {
    db.exec(`UPDATE OR IGNORE ${tabel} SET sleutel = substr(sleutel, 1, instr(sleutel, '_R') - 1)
      WHERE soort = 'serie' AND instr(sleutel, '_R') > 0`);
  }
  if (DEMO) vulDemo(db);
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
