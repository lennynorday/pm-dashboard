/**
 * Sprekers in notulen. Claude schrijft wie spreekt als `[[Speaker 1]]`; een plek
 * met een eigen naam is `[[Speaker 1|Eva Smit]]`. Bij akkoord worden de namen ingevuld.
 */

export type Spreker = {
  /** Het label uit het transcript, zoals "Speaker 1". */
  label: string;
  naam: string;
  /** Een letterlijke zin van deze spreker, om te herkennen wie het is. */
  citaat: string;
};

export const VERWIJZING = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g;

/** Een verwijzing voor in de Markdown; | en ] mogen niet in een naam. */
export function verwijzing(label: string, naam?: string | null): string {
  const schoon = (tekst: string) => tekst.replace(/[|\]\s]+/g, " ").trim();
  return naam ? `[[${schoon(label)}|${schoon(naam)}]]` : `[[${schoon(label)}]]`;
}

/** De naam op een plek: de eigen naam van die plek, anders die van de spreker, anders het label. */
export function naamOp(
  label: string,
  eigen: string | undefined | null,
  sprekers: Spreker[],
): string {
  return eigen || sprekers.find((s) => s.label === label)?.naam || label;
}

/** Bij Aanwezig de volledige naam, elders de voornaam; een omschrijving ("iemand van KH") blijft heel. */
export function toonNaam(naam: string, volledig: boolean): string {
  if (volledig || !/^\p{Lu}/u.test(naam)) return naam;
  return naam.split(" ")[0];
}

const isAanwezig = (regel: string) => /^\s*\*\*Aanwezig:\*\*/.test(regel);

/** Vervangt de verwijzingen door namen; tekst zonder verwijzingen blijft gelijk. */
export function vulNamenIn(md: string, sprekers: Spreker[]): string {
  return md
    .split("\n")
    .map((regel) =>
      regel.replace(VERWIJZING, (_, label: string, eigen?: string) => {
        const naam = naamOp(label.trim(), eigen?.trim(), sprekers);
        // Zonder naam blijft het label staan, niet ingekort tot "Speaker".
        return naam === label.trim() ? naam : toonNaam(naam, isAanwezig(regel));
      }),
    )
    .join("\n");
}

/** Het blok <sprekers> van Claude: "- Speaker 1 = Naam | letterlijke zin". */
export function leesSprekers(blok: string): Spreker[] {
  const sprekers: Spreker[] = [];
  for (const regel of blok.split("\n")) {
    const match =
      /^\s*[-*]?\s*([^=]+?)\s*=\s*([^|]+?)\s*(?:\|\s*(.*?))?\s*$/.exec(regel);
    if (!match) continue;
    const label = match[1].replace(/^\[\[|\]\]$/g, "").trim();
    if (!label || sprekers.some((s) => s.label === label)) continue;
    sprekers.push({
      label,
      naam: match[2].trim(),
      citaat: (match[3] ?? "").replace(/^["“”']+|["“”']+$/g, "").trim(),
    });
  }
  return sprekers;
}

/** Sprekers uit de database of van de client; ongeldige items vallen weg. */
export function parseSprekers(waarde: unknown): Spreker[] {
  let lijst = waarde;
  if (typeof waarde === "string") {
    try {
      lijst = JSON.parse(waarde);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lijst)) return [];
  const kort = (tekst: unknown, max: number) =>
    typeof tekst === "string" && tekst.trim().length <= max
      ? tekst.trim()
      : null;
  return lijst.slice(0, 20).flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { label, naam, citaat } = item as Record<string, unknown>;
    const goed = {
      label: kort(label, 100),
      naam: kort(naam, 200),
      citaat: kort(citaat, 500) ?? "",
    };
    return goed.label && goed.naam
      ? [{ label: goed.label, naam: goed.naam, citaat: goed.citaat }]
      : [];
  });
}
