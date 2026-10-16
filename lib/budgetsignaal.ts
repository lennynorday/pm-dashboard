import { formatUren } from "./format.ts";
import type { ProjectBudgetResult } from "./orbit/budget.ts";

export type Signaal = {
  soort: "ok" | "open" | "rood" | "rustig";
  icoon: "check" | "geen" | "alert" | "up" | "down" | "clock";
  tekst: string;
};

const uren = (minuten: number) => `${formatUren(minuten)}u`;

/** Eén signaal per regel (minuten): te veel gepland, anders ongepland (>10% open), anders vrij. */
export function regelStatus(
  budget: number,
  geschreven: number,
  gepland: number,
): Signaal {
  const rest = budget - geschreven - gepland;
  if (rest < -3) {
    return {
      soort: "rood",
      icoon: "alert",
      tekst: `${uren(-rest)} te veel gepland`,
    };
  }
  if (rest > budget * 0.1) {
    return {
      soort: "open",
      icoon: "geen",
      tekst: `${uren(rest)} ongepland`,
    };
  }
  return {
    soort: "ok",
    icoon: "check",
    tekst: `${uren(Math.max(0, rest))} vrij`,
  };
}

/** Geschreven tegenover de pot naar rato van de verstreken tijd (0-100); marge 5% van de pot. */
export function slaStatus(
  budget: number,
  geschreven: number,
  tijdProcent: number,
): Signaal {
  const verschil = geschreven - budget * (tijdProcent / 100);
  const marge = budget * 0.05;
  if (verschil > marge) {
    return {
      soort: "rood",
      icoon: "up",
      tekst: `${uren(verschil)} voor op schema`,
    };
  }
  if (verschil < -marge) {
    return {
      soort: "open",
      icoon: "down",
      tekst: `${uren(-verschil)} achter op schema`,
    };
  }
  return { soort: "ok", icoon: "check", tekst: "Op schema" };
}

const DAG = 24 * 60 * 60 * 1000;

/** Hoeveel procent (0-100) van de looptijd voorbij is: 1 januari of de start als die later ligt, t/m 31 december. */
export function looptijdProcent(start: string | null, vandaag: Date): number {
  const jaar = vandaag.getFullYear();
  const jan = Date.UTC(jaar, 0, 1);
  const begin = Math.max(jan, start ? Date.parse(start) : jan);
  const eind = Date.UTC(jaar, 11, 31);
  const nu = Date.UTC(jaar, vandaag.getMonth(), vandaag.getDate());
  const procent = Math.round(
    ((nu - begin) / Math.max(eind - begin, DAG)) * 100,
  );
  return Math.min(100, Math.max(0, procent));
}

/** Een project is een SLA als "SLA" als los woord in de naam staat. */
export function isSla(projectNaam: string): boolean {
  return /\bSLA\b/i.test(projectNaam);
}

export const BUDGET_MELDING: Record<ProjectBudgetResult["status"], string> = {
  ok: "Geen uren gepland in Orbit",
  laden: "Wordt opgehaald",
  fout: "Budget kon niet worden opgehaald uit Orbit",
  "niet-verbonden": "Niet verbonden met Orbit",
};
