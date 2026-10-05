export type MenuStand = "uitgeklapt" | "ingeklapt";

export const MENU_COOKIE = "pm-menu";

/** Of de groep "Overige Culture-accounts" in het zijmenu open staat. */
export type GroepStand = "open" | "dicht";

export const OVERIGE_COOKIE = "pm-overige";

export function parseMenuStand(value: string | undefined): MenuStand {
  return value === "ingeklapt" ? "ingeklapt" : "uitgeklapt";
}

export function parseGroepStand(value: string | undefined): GroepStand {
  return value === "open" ? "open" : "dicht";
}
