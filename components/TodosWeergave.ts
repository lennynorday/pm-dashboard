export type Weergave = "kanban" | "lijst";

/** De gekozen weergave op de pagina To-do's. */
export const TODOS_COOKIE = "pm-todos";

export function parseWeergave(value: string | undefined): Weergave {
  return value === "lijst" ? "lijst" : "kanban";
}
