import { database } from "./db";
import type { InboxBron, Uitsluiting } from "./taak";

/** Of deze bron in de Inbox van de gebruiker komt; standaard aan. */
export function bronAan(email: string, bron: InboxBron): boolean {
  return !database()
    .prepare("SELECT 1 FROM inbox_uit WHERE email = ? AND bron = ?")
    .get(email, bron);
}

export function zetBron(email: string, bron: InboxBron, aan: boolean): void {
  database()
    .prepare(
      aan
        ? "DELETE FROM inbox_uit WHERE email = ? AND bron = ?"
        : "INSERT OR IGNORE INTO inbox_uit (email, bron) VALUES (?, ?)",
    )
    .run(email, bron);
}

/** De uitsluitlijst van Gmail, in de volgorde waarin hij is gevuld. */
export function leesUitsluitingen(email: string): Uitsluiting[] {
  return database()
    .prepare(
      "SELECT waarde, soort FROM gmail_uitgesloten WHERE email = ? ORDER BY rowid",
    )
    .all(email)
    .flatMap((row) =>
      typeof row.waarde === "string" &&
      (row.soort === "afzender" || row.soort === "domein")
        ? [{ waarde: row.waarde, soort: row.soort }]
        : [],
    );
}

export function sluitUit(email: string, uitsluiting: Uitsluiting): void {
  database()
    .prepare(
      "INSERT OR IGNORE INTO gmail_uitgesloten (email, waarde, soort) VALUES (?, ?, ?)",
    )
    .run(email, uitsluiting.waarde.toLowerCase(), uitsluiting.soort);
}

export function staToe(email: string, waarde: string): void {
  database()
    .prepare("DELETE FROM gmail_uitgesloten WHERE email = ? AND waarde = ?")
    .run(email, waarde.toLowerCase());
}

/** Het domein van een e-mailadres, in kleine letters. */
export const domeinVan = (adres: string): string =>
  adres.slice(adres.lastIndexOf("@") + 1).toLowerCase();

/** Of mail van dit adres op de uitsluitlijst staat, als adres of als domein. */
export function isUitgesloten(
  adres: string,
  uitsluitingen: Uitsluiting[],
): boolean {
  const klein = adres.toLowerCase();
  return uitsluitingen.some(({ waarde, soort }) =>
    soort === "afzender" ? waarde === klein : waarde === domeinVan(klein),
  );
}
