import { database } from "./db";

/** Ids van feeditems die deze gebruiker heeft genegeerd. */
export function readGenegeerd(email: string): string[] {
  return database()
    .prepare("SELECT id FROM genegeerde_meldingen WHERE email = ?")
    .all(email)
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
}

export function negeer(email: string, id: string): void {
  database()
    .prepare(
      "INSERT OR IGNORE INTO genegeerde_meldingen (email, id) VALUES (?, ?)",
    )
    .run(email, id);
}

export function herstelAlles(email: string): void {
  database()
    .prepare("DELETE FROM genegeerde_meldingen WHERE email = ?")
    .run(email);
}
