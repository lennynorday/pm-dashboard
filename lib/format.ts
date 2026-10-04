import type { BillingMode, ProjectState } from "./orbit/projects";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Verwacht een datum als "2026-12-31". */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T12:00:00`));
}

export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

export const PROJECT_STATE_LABELS: Record<ProjectState, string> = {
  DRAFT: "Concept",
  OPEN: "Open",
  CLOSED: "Afgesloten",
  ARCHIVED: "Gearchiveerd",
};

export const BILLING_MODE_LABELS: Record<BillingMode, string> = {
  NONE: "Niet factureerbaar",
  ESTIMATE: "Schatting",
  HOURS: "Op basis van uren",
  FIXED: "Vaste prijs",
  OFFER: "Offerte",
  SUBSCRIPTION: "Abonnement",
};
