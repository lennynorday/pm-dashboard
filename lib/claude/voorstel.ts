/** Wat Claude teruggeeft en hoe een opdracht eruitziet. Zonder database-import, zodat dit los te testen is en ook in client components mag. */
import type { Bron } from "../taak";

export const SOORTEN = ["gmail-concept", "slack-concept", "advies"] as const;
export type Soort = (typeof SOORTEN)[number];

export const SOORT_LABELS: Record<Soort, string> = {
  "gmail-concept": "Gmail-concept",
  "slack-concept": "Slack-concept",
  advies: "Advies",
};

export const OPDRACHT_STATUSSEN = [
  "bezig",
  "voorstel",
  "akkoord",
  "afgewezen",
  "mislukt",
] as const;
export type OpdrachtStatus = (typeof OPDRACHT_STATUSSEN)[number];

export const parseOpdrachtStatus = (waarde: unknown): OpdrachtStatus | null =>
  OPDRACHT_STATUSSEN.find((status) => status === waarde) ?? null;
export const parseSoort = (waarde: unknown): Soort | null =>
  SOORTEN.find((soort) => soort === waarde) ?? null;

export type Voorstel = {
  soort: Soort;
  /** Alleen bij een concept; komt van het dashboard, niet van Claude. */
  ontvanger: string | null;
  /** Alleen bij een mailconcept; komt van het dashboard, niet van Claude. */
  onderwerp: string | null;
  tekst: string;
};

/** Een opdracht zoals de pagina hem toont: de stand en de nieuwste versie. */
export type Opdracht = {
  id: number;
  taakId: number;
  status: OpdrachtStatus;
  soort: Soort;
  /** Waarom een run mislukte; alleen bij status mislukt. */
  fout: string | null;
  /** De link naar het concept in Gmail, nadat Akkoord het klaarzette. */
  conceptUrl: string | null;
  voorstel: Voorstel | null;
};

/** De soort uitkomst die bij de bron van de to-do past. */
export function soortVoorBron(bron: Bron): Soort {
  if (bron === "gmail") return "gmail-concept";
  if (bron === "slack") return "slack-concept";
  return "advies";
}

export type Uitvoer = { voorstel: Voorstel } | { fout: string };

const object = (waarde: unknown): Record<string, unknown> | null =>
  typeof waarde === "object" && waarde !== null && !Array.isArray(waarde)
    ? (waarde as Record<string, unknown>)
    : null;

const optioneel = (waarde: unknown): string | null =>
  typeof waarde === "string" && waarde.trim() ? waarde.trim() : null;

function parseJson(tekst: string): unknown {
  try {
    return JSON.parse(tekst);
  } catch {
    return undefined;
  }
}

/**
 * Parset de uitvoer van `claude -p --output-format json` naar een Voorstel.
 * Claude mag het object in een codeblok of een zin zetten; wat geen geldig
 * object met de verwachte soort en een tekst is, wordt een fout. Advies is altijd toegestaan,
 * zodat Claude kan zeggen dat een concept niet past.
 */
export function parseUitvoer(stdout: string, verwacht: Soort): Uitvoer {
  const envelop = object(parseJson(stdout));
  if (!envelop) return { fout: "Claude gaf geen leesbaar antwoord" };
  const antwoord = typeof envelop.result === "string" ? envelop.result : "";
  if (envelop.is_error === true) {
    return { fout: antwoord || "Claude Code gaf een fout" };
  }

  const begin = antwoord.indexOf("{");
  const eind = antwoord.lastIndexOf("}");
  const kern = object(
    begin < 0 || eind < begin
      ? undefined
      : parseJson(antwoord.slice(begin, eind + 1)),
  );
  if (!kern) return { fout: "Claude gaf geen geldig JSON-object terug" };

  const soort = parseSoort(kern.soort);
  if (!soort) return { fout: "Claude gaf een onbekende soort terug" };
  if (soort !== "advies" && soort !== verwacht) {
    return { fout: `Claude gaf ${soort} terug, verwacht was ${verwacht}` };
  }
  const tekst = optioneel(kern.tekst);
  if (!tekst) return { fout: "Claude gaf geen tekst terug" };

  // Claude levert alleen soort en tekst; ontvanger en onderwerp komen uit de bron.
  return { voorstel: { soort, ontvanger: null, onderwerp: null, tekst } };
}
