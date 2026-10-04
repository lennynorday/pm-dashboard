export type Thema = "licht" | "donker" | "systeem";
export type MenuStand = "uitgeklapt" | "ingeklapt";

export const THEMA_COOKIE = "pm-thema";
export const MENU_COOKIE = "pm-menu";

export function parseThema(value: string | undefined): Thema {
  return value === "licht" || value === "donker" ? value : "systeem";
}

export function parseMenuStand(value: string | undefined): MenuStand {
  return value === "ingeklapt" ? "ingeklapt" : "uitgeklapt";
}

/** De waarde voor data-theme op <html>, zoals de tokens die verwachten. */
export function dataTheme(thema: Thema): "light" | "dark" | undefined {
  if (thema === "licht") return "light";
  if (thema === "donker") return "dark";
  return undefined;
}
