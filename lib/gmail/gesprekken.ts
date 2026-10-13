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

function json(waarde: unknown): Json {
  return typeof waarde === "object" && waarde !== null ? (waarde as Json) : {};
}

const lijst = (waarde: unknown): Json[] =>
  Array.isArray(waarde) ? waarde.map(json) : [];

const labels = (bericht: Json): unknown[] =>
  Array.isArray(bericht.labelIds) ? bericht.labelIds : [];

function header(bericht: Json, naam: string): string {
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
 * niet (meer) op jou wacht: de laatste mail is van jou (beantwoord), de
 * afzender is uitgesloten, of je staat niet in Aan of CC. Met een ster komt hij
 * er altijd in.
 */
export function beoordeelGesprek(
  thread: Json,
  ik: string,
  uitgesloten: (adres: string) => boolean,
): GmailGesprek | null {
  const berichten = lijst(thread.messages).filter(
    (bericht) =>
      !labels(bericht).some((label) => OVERSLAAN.includes(String(label))),
  );
  const laatste = berichten.at(-1);
  const tijd = Math.floor(Number(laatste?.internalDate) / 1000);
  if (typeof thread.id !== "string" || !laatste || !Number.isFinite(tijd)) {
    return null;
  }

  const { naam, adres } = parseVan(header(laatste, "From"));
  const ster = berichten.some((bericht) => labels(bericht).includes("STARRED"));
  const vanMij = labels(laatste).includes("SENT") || adres === ik.toLowerCase();
  const aan = adressen(header(laatste, "To")).includes(ik.toLowerCase());
  const cc = adressen(header(laatste, "Cc")).includes(ik.toLowerCase());
  const soort = ster ? "Ster" : aan ? "Aan" : cc ? "CC" : null;
  if (!soort || (!ster && (vanMij || uitgesloten(adres)))) return null;

  return {
    id: thread.id,
    onderwerp: header(laatste, "Subject") || "(geen onderwerp)",
    tekst: decodeer(String(laatste.snippet ?? "")).slice(0, TEKST_LENGTE),
    naam,
    adres,
    tijd,
    soort,
  };
}
