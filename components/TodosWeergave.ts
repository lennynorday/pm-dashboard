export type Weergave = "kanban" | "lijst";

/** De gekozen weergave op de pagina To-do's. */
export const TODOS_COOKIE = "pm-todos";

export type Sortering = "nieuwste" | "prio" | "eigen";

/** De gekozen sortering van het kanbanbord. */
export const SORTERING_COOKIE = "pm-todos-sortering";

export const SORTERING_LABELS: Record<Sortering, string> = {
  nieuwste: "Nieuwste",
  prio: "Prio",
  eigen: "Eigen volgorde",
};

export function parseSortering(value: string | undefined): Sortering {
  return value === "prio" || value === "eigen" ? value : "nieuwste";
}

export function parseWeergave(value: string | undefined): Weergave {
  return value === "lijst" ? "lijst" : "kanban";
}
