/** Van Gmail-thread naar Inbox-item. Zonder database-import, zodat dit los te testen is. */
type Json = Record<string, unknown>;

/** Eén mailgesprek zoals het in de Inbox komt; alles over de laatste mail. */
export type GmailGesprek = {
  /** Thread-id. */
  id: string;
  onderwerp: string;
  /** De eerste ±200 tekens van de laatste mail. */
  tekst: string;
  naam: string;
  adres: string;
  /** Unix-seconden. */
  tijd: number;
  /** "Ster", "Aan" of "CC". */
  soort: string;
};

const TEKST_LENGTE = 200;
// Een concept is nog geen antwoord; prullenbak en spam tellen niet mee.
const OVERSLAAN = ["DRAFT", "TRASH", "SPAM"];

export function json(waarde: unknown): Json {
  return typeof waarde === "object" && waarde !== null ? (waarde as Json) : {};
}

export const lijst = (waarde: unknown): Json[] =>
  Array.isArray(waarde) ? waarde.map(json) : [];

const labels = (bericht: Json): unknown[] =>
  Array.isArray(bericht.labelIds) ? bericht.labelIds : [];

export function header(bericht: Json, naam: string): string {
  const gevonden = lijst(json(bericht.payload).headers).find(
    (kop) => String(kop.name).toLowerCase() === naam.toLowerCase(),
  );
  return typeof gevonden?.value === "string" ? gevonden.value : "";
}

/** Alle adressen in een To-, Cc- of From-header, in kleine letters. */
const adressen = (waarde: string): string[] =>
  (waarde.match(/[^\s<>,;"]+@[^\s<>,;"]+/g) ?? []).map((adres) =>
    adres.toLowerCase(),
  );

/** `"Naam" <adres>` of alleen `adres`; zonder naam is de naam het adres. */
export function parseVan(van: string): { naam: string; adres: string } {
  const adres = adressen(van)[0] ?? "";
  const naam = van
    .replace(/<[^>]*>/, "")
    .replace(/["']/g, "")
    .trim();
  return { naam: naam && !naam.includes("@") ? naam : adres, adres };
}

const ENTITEITEN: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** De snippet van Gmail heeft HTML-entities, zoals `&#39;` en `&amp;`. */
export const decodeer = (tekst: string): string =>
  tekst.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (geheel, code: string) => {
    if (code[0] !== "#") return ENTITEITEN[code.toLowerCase()] ?? geheel;
    const getal =
      code[1].toLowerCase() === "x"
        ? parseInt(code.slice(2), 16)
        : Number(code.slice(1));
    return String.fromCodePoint(getal);
  });

/**
 * Het Inbox-item van een thread (`threads.get` met metadata), of null als die
 * niet (meer) op jou wacht: gearchiveerd (geen bericht in Postvak IN), de
 * laatste mail is van jou (beantwoord), de afzender is uitgesloten, of je
 * staat niet in Aan of CC. Met een ster komt hij er altijd in. Afzender, tekst
 * en tijd komen van de laatste mail van een ander, zodat je eigen antwoord
 * een genegeerd gesprek niet terughaalt.
 */
export function beoordeelGesprek(
  thread: Json,
  ik: string,
  uitgesloten: (adres: string) => boolean,
): GmailGesprek | null {
  const mij = ik.toLowerCase();
  const berichten = lijst(thread.messages).filter(
    (bericht) =>
      !labels(bericht).some((label) => OVERSLAAN.includes(String(label))),
  );
  const vanMij = (bericht: Json) =>
    labels(bericht).includes("SENT") ||
    parseVan(header(bericht, "From")).adres === mij;
  const laatste = berichten.at(-1);
  const bron = berichten.findLast((bericht) => !vanMij(bericht)) ?? laatste;
  const tijd = Math.floor(Number(bron?.internalDate) / 1000);
  if (
    typeof thread.id !== "string" ||
    !laatste ||
    !bron ||
    !Number.isFinite(tijd)
  ) {
    return null;
  }

  const heeft = (label: string) =>
    berichten.some((bericht) => labels(bericht).includes(label));
  const ster = heeft("STARRED");
  const { naam, adres } = parseVan(header(bron, "From"));
  const aan = adressen(header(bron, "To")).includes(mij);
  const cc = adressen(header(bron, "Cc")).includes(mij);
  const soort = ster ? "Ster" : aan ? "Aan" : cc ? "CC" : null;
  const wacht = heeft("INBOX") && !vanMij(laatste) && !uitgesloten(adres);
  if (!soort || (!ster && !wacht)) return null;

  return {
    id: thread.id,
    onderwerp: header(bron, "Subject") || "(geen onderwerp)",
    tekst: decodeer(String(bron.snippet ?? "")).slice(0, TEKST_LENGTE),
    naam,
    adres,
    tijd,
    soort,
  };
}
