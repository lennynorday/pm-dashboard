import { database } from "./db";

/** Projectnummers die deze gebruiker heeft verborgen. */
export function readHiddenProjects(email: string): string[] {
  return database()
    .prepare("SELECT nummer FROM verborgen_projecten WHERE email = ?")
    .all(email)
    .map((row) => row.nummer)
    .filter((nummer): nummer is string => typeof nummer === "string");
}

export function hideProject(email: string, number: string): void {
  database()
    .prepare(
      "INSERT OR IGNORE INTO verborgen_projecten (email, nummer) VALUES (?, ?)",
    )
    .run(email, number);
}

export function showProject(email: string, number: string): void {
  database()
    .prepare("DELETE FROM verborgen_projecten WHERE email = ? AND nummer = ?")
    .run(email, number);
}
