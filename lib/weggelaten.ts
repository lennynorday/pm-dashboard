/** Passages die Claude uit de notulen liet omdat ze over personen gingen. Zonder database-import, zodat dit los te testen is. */

/** Een weggelaten passage; `onderwerp` is het nummer van "## N." waar hij bij hoorde. */
export type Passage = { onderwerp: number | null; tekst: string };

/** Het blok <weggelaten> uit het antwoord van Claude: regels als "- [2] tekst". */
export function leesWeggelaten(blok: string): Passage[] {
  return blok.split("\n").flatMap((regel) => {
    const deel = /^\s*[-*]\s*(?:\[(\d+)\]\s*)?(.+?)\s*$/.exec(regel);
    if (!deel) return [];
    return [{ onderwerp: deel[1] ? Number(deel[1]) : null, tekst: deel[2] }];
  });
}

/** De bewaarde JSON; een lege lijst als er niets (leesbaars) is. */
export function parsePassages(json: unknown): Passage[] {
  if (typeof json !== "string") return [];
  try {
    const lijst: unknown = JSON.parse(json);
    if (!Array.isArray(lijst)) return [];
    return lijst.flatMap((p: unknown) => {
      if (typeof p !== "object" || p === null) return [];
      const { onderwerp, tekst } = p as Record<string, unknown>;
      if (typeof tekst !== "string") return [];
      return [
        { onderwerp: typeof onderwerp === "number" ? onderwerp : null, tekst },
      ];
    });
  } catch {
    return [];
  }
}

/** Zet de passage als bullet onderaan zijn onderwerp; zonder (bestaand) onderwerp onderaan de notulen. */
export function zetPassageTerug(notulen: string, passage: Passage): string {
  const regels = notulen.split("\n");
  const kop = regels.findIndex((regel) =>
    regel.startsWith(`## ${passage.onderwerp}. `),
  );
  const bullet = `- ${passage.tekst}`;
  if (passage.onderwerp === null || kop < 0)
    return `${notulen.trimEnd()}\n${bullet}`;
  const volgende = regels.findIndex(
    (regel, i) => i > kop && /^## /.test(regel),
  );
  const eind = volgende < 0 ? regels.length : volgende;
  // Na de laatste niet-lege regel van het onderwerp, vóór de witregel naar het volgende.
  let plek = eind;
  while (plek > kop + 1 && !regels[plek - 1].trim()) plek -= 1;
  regels.splice(plek, 0, bullet);
  return regels.join("\n");
}
