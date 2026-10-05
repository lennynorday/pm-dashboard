import { database } from "./db";
import { LINK_TYPES, LinkInput } from "./links";

export type Contactpersoon = {
  naam: string;
  rol?: string;
  email?: string;
};

/** Wat Orbit niet weet over een account; gedeeld door alle gebruikers. */
export type AccountGegevens = {
  /** Leeg: de naam uit Orbit. */
  naam?: string;
  am?: string;
  /** Jira-projecten van dit account. */
  jiraKeys: string[];
  /** Organizations in SUPP (Beheer en Support). */
  supportOrganizations: string[];
  contactpersonen: Contactpersoon[];
  links: LinkInput[];
};

/** Per account-slug, bijvoorbeeld "centraal-museum-utrecht". */
export type AlleAccountGegevens = Record<string, AccountGegevens>;

export const LEGE_GEGEVENS: AccountGegevens = {
  jiraKeys: [],
  supportOrganizations: [],
  contactpersonen: [],
  links: [],
};

function record(data: unknown): Record<string, unknown> | null {
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : null;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function texts(value: unknown, veld: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${veld} moet een lijst met tekst zijn`);
  }
  return value.map((item: string) => item.trim()).filter(Boolean);
}

function list<T>(
  value: unknown,
  veld: string,
  parse: (item: Record<string, unknown>) => T,
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${veld} moet een lijst zijn`);
  return value.map((item: unknown) => {
    const object = record(item);
    if (!object) throw new Error(`${veld} bevat iets dat geen object is`);
    return parse(object);
  });
}

function parseContactpersoon(item: Record<string, unknown>): Contactpersoon {
  const naam = optionalText(item.naam);
  if (!naam) throw new Error("Een contactpersoon heeft geen naam");
  return { naam, rol: optionalText(item.rol), email: optionalText(item.email) };
}

function parseLink(item: Record<string, unknown>): LinkInput {
  const label = optionalText(item.label);
  const url = optionalText(item.url);
  if (!label || !url) throw new Error("Een link heeft geen label of url");
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`De link "${label}" begint niet met http:// of https://`);
  }
  const type = LINK_TYPES.find((linkType) => linkType === item.type);
  if (item.type !== undefined && !type) {
    throw new Error(`De link "${label}" heeft een onbekend type`);
  }
  return { label, url, type };
}

/** Parst de gegevens van één account; gooit een fout met uitleg als ze niet kloppen. */
export function parseAccountGegevens(data: unknown): AccountGegevens {
  const object = record(data);
  if (!object) throw new Error("Accountgegevens moeten een object zijn");
  return {
    naam: optionalText(object.naam),
    am: optionalText(object.am),
    jiraKeys: texts(object.jiraKeys, "jiraKeys"),
    supportOrganizations: texts(
      object.supportOrganizations,
      "supportOrganizations",
    ),
    contactpersonen: list(
      object.contactpersonen,
      "contactpersonen",
      parseContactpersoon,
    ),
    links: list(object.links, "links", parseLink),
  };
}

const EXPORT_VERSIE = 1;

export type Export = { versie: number; accounts: AlleAccountGegevens };

/** Parst een exportbestand; gooit een fout met de naam van het account dat niet klopt. */
export function parseExport(data: unknown): AlleAccountGegevens {
  const object = record(data);
  const accounts = record(object?.accounts);
  if (object?.versie !== EXPORT_VERSIE || !accounts) {
    throw new Error("Dit is geen exportbestand van het PM-dashboard");
  }
  return Object.fromEntries(
    Object.entries(accounts).map(([slug, gegevens]) => {
      try {
        return [slug, parseAccountGegevens(gegevens)];
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Account ${slug}: ${message}`);
      }
    }),
  );
}

export function readAccountGegevens(): AlleAccountGegevens {
  const rows = database()
    .prepare("SELECT slug, gegevens FROM account_gegevens")
    .all();
  return Object.fromEntries(
    rows.flatMap((row) => {
      if (typeof row.slug !== "string" || typeof row.gegevens !== "string") {
        return [];
      }
      try {
        return [[row.slug, parseAccountGegevens(JSON.parse(row.gegevens))]];
      } catch {
        // Kapotte gegevens van één account mogen de rest niet tegenhouden.
        return [];
      }
    }),
  );
}

/** Voegt accounts toe of werkt ze bij, in één keer; andere accounts blijven staan. */
export function saveAccountGegevens(accounts: AlleAccountGegevens): void {
  const db = database();
  const upsert = db.prepare(
    `INSERT INTO account_gegevens (slug, gegevens) VALUES (?, ?)
     ON CONFLICT (slug) DO UPDATE SET gegevens = excluded.gegevens`,
  );
  db.exec("BEGIN");
  try {
    Object.entries(accounts).forEach(([slug, gegevens]) =>
      upsert.run(slug, JSON.stringify(gegevens)),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function exportAccountGegevens(): Export {
  return { versie: EXPORT_VERSIE, accounts: readAccountGegevens() };
}
