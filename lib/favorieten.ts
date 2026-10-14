import { database } from "./db";

/** Orbit-id's van de mappen en regels die deze gebruiker als favoriet markeerde. */
export function readFavorieten(email: string): string[] {
  return database()
    .prepare("SELECT id FROM favorieten WHERE email = ?")
    .all(email)
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
}

export function zetFavoriet(email: string, id: string, aan: boolean): void {
  database()
    .prepare(
      aan
        ? "INSERT OR IGNORE INTO favorieten (email, id) VALUES (?, ?)"
        : "DELETE FROM favorieten WHERE email = ? AND id = ?",
    )
    .run(email, id);
}
