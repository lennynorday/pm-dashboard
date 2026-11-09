/** Waar een meeting in de notulen-flow staat. Zonder database-import, zodat dit los te testen is en ook in client components mag. */
import { FOCUS, type Meeting, PRIVE } from "./meetings.ts";

export const STAPPEN = [
  "Ingepland",
  "Opgenomen",
  "Transcript",
  "Notulen",
  "In Superhuman",
  "Gedeeld",
  "Actiepunten",
] as const;

/** Klaar, wacht op jou, dashboard bezig, vastgelopen of geen notulen. */
export type Stand = "ok" | "jij" | "open" | "warn" | "muted";

/** Wat er per meeting in de database staat. `stap` is het aantal afgeronde stappen. */
export type NotulenRij = {
  meetingId: string;
  stap: number;
  opnameId: string | null;
  tekst: string | null;
  paginaUrl: string | null;
  fout: string | null;
};

export type NotulenStatus = {
  stap: number;
  stand: Stand;
  tekst: string;
  /** Vastgelopen: 4 uur na de meeting nog geen opname of transcript. */
  vast: boolean;
  fout: string | null;
  opnameId: string | null;
  notulen: string | null;
  paginaUrl: string | null;
};

/** De opname in Plaud web; de URL gebruikt het id zonder "of_". */
export const plaudWebUrl = (id: string) =>
  `https://web.plaud.ai/file/${id.replace(/^of_/, "")}`;

export const VASTGELOPEN_MS = 4 * 60 * 60 * 1000;

const MISLUKT = [
  "",
  "Opname zoeken mislukt",
  "Transcript ophalen mislukt",
  "Notulen maken mislukt",
  "Naar Superhuman mislukt",
];

/**
 * De status van één meeting; null als er geen notulen-flow is: Focus, nog niet
 * geweest, of afgelopen vóór het dashboard notulen ging maken (`vanaf`).
 */
export function notulenStatus(
  meeting: Pick<Meeting, "hoort" | "overgeslagen" | "afgelopen" | "einde">,
  rij: NotulenRij | undefined,
  vanaf: number | null,
  nu: number,
): NotulenStatus | null {
  if (meeting.hoort === FOCUS) return null;
  const basis = {
    stap: rij?.stap ?? 1,
    vast: false,
    fout: rij?.fout ?? null,
    opnameId: rij?.opnameId ?? null,
    notulen: rij?.tekst ?? null,
    paginaUrl: rij?.paginaUrl ?? null,
  };
  if (meeting.overgeslagen) {
    return {
      ...basis,
      stap: rij?.stap ?? 0,
      stand: "muted",
      tekst: "Geen notulen",
    };
  }
  const eind = Date.parse(meeting.einde);
  if (!meeting.afgelopen) return null;
  if (!rij && (vanaf === null || eind < vanaf)) return null;

  const { stap } = basis;
  if (basis.fout)
    return { ...basis, stand: "warn", tekst: MISLUKT[stap] ?? "Mislukt" };
  const vast = stap <= 2 && nu - eind > VASTGELOPEN_MS;
  if (stap <= 1) {
    return vast
      ? { ...basis, vast, stand: "warn", tekst: "Geen opname gevonden" }
      : { ...basis, stand: "open", tekst: "Wacht op opname" };
  }
  if (stap === 2) {
    return vast
      ? { ...basis, vast, stand: "warn", tekst: "Transcript ontbreekt" }
      : {
          ...basis,
          stand: "jij",
          tekst: "Wacht op jou: auto-generate in Plaud",
        };
  }
  if (stap === 3)
    return { ...basis, stand: "open", tekst: "Claude maakt notulen" };
  if (stap === 4) return { ...basis, stand: "open", tekst: "Naar Superhuman" };
  // shortcut: Delen en Actiepunten komen in latere PR's; tot dan is privé hier klaar en wacht de rest op jou.
  if (meeting.hoort === PRIVE) return { ...basis, stand: "ok", tekst: "Klaar" };
  return { ...basis, stand: "jij", tekst: "Wacht op jou: delen" };
}

/** Nog te doen: een status die niet klaar en niet overgeslagen is. */
export const nogTeDoen = (status: NotulenStatus | null) =>
  status !== null && status.stand !== "ok" && status.stand !== "muted";
