import { database } from "./db";
import type { Overslaan, Regel } from "./meetings";

const tekst = (waarde: unknown) => (typeof waarde === "string" ? waarde : null);
const getal = (waarde: unknown) => (typeof waarde === "number" ? waarde : null);

export function leesRegels(email: string): Regel[] {
  return database()
    .prepare(
      "SELECT soort, sleutel, doel, titel, vanaf, kanaal FROM meeting_regels WHERE email = ? ORDER BY rowid",
    )
    .all(email)
    .flatMap((rij) => {
      const soort = rij.soort;
      if (soort !== "meeting" && soort !== "serie" && soort !== "titel")
        return [];
      return [
        {
          soort,
          sleutel: String(rij.sleutel),
          doel: String(rij.doel),
          titel: String(rij.titel),
          vanaf: getal(rij.vanaf),
          kanaal: tekst(rij.kanaal),
        },
      ];
    });
}

/** Bewaart een keuze; een eerdere keuze voor dezelfde meeting, serie of titel vervalt. Het kanaal blijft staan. */
export function bewaarRegel(email: string, regel: Omit<Regel, "kanaal">): void {
  database()
    .prepare(
      `INSERT INTO meeting_regels (email, soort, sleutel, doel, titel, vanaf) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (email, soort, sleutel) DO UPDATE SET
         doel = excluded.doel, titel = excluded.titel, vanaf = excluded.vanaf`,
    )
    .run(
      email,
      regel.soort,
      regel.sleutel,
      regel.doel,
      regel.titel,
      regel.vanaf,
    );
}

export function verwijderMeetingRegel(email: string, id: string): void {
  database()
    .prepare(
      "DELETE FROM meeting_regels WHERE email = ? AND soort = 'meeting' AND sleutel = ?",
    )
    .run(email, id);
}

export function zetKanaal(
  email: string,
  serieId: string,
  kanaal: string,
): void {
  database()
    .prepare(
      "UPDATE meeting_regels SET kanaal = ? WHERE email = ? AND soort = 'serie' AND sleutel = ?",
    )
    .run(kanaal || null, email, serieId);
}

export function leesOvergeslagen(email: string): Overslaan[] {
  return database()
    .prepare(
      "SELECT soort, sleutel, titel FROM meetings_overgeslagen WHERE email = ? ORDER BY rowid",
    )
    .all(email)
    .flatMap((rij) =>
      rij.soort === "meeting" || rij.soort === "serie"
        ? [
            {
              soort: rij.soort,
              sleutel: String(rij.sleutel),
              titel: String(rij.titel),
            },
          ]
        : [],
    );
}

export function slaOver(email: string, overslaan: Overslaan): void {
  database()
    .prepare(
      "INSERT OR IGNORE INTO meetings_overgeslagen (email, soort, sleutel, titel) VALUES (?, ?, ?, ?)",
    )
    .run(email, overslaan.soort, overslaan.sleutel, overslaan.titel);
}

export function zetTerug(
  email: string,
  soort: Overslaan["soort"],
  sleutel: string,
): void {
  database()
    .prepare(
      "DELETE FROM meetings_overgeslagen WHERE email = ? AND soort = ? AND sleutel = ?",
    )
    .run(email, soort, sleutel);
}
