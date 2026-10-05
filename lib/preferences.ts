export type MenuStand = "uitgeklapt" | "ingeklapt";

export const MENU_COOKIE = "pm-menu";

export function parseMenuStand(value: string | undefined): MenuStand {
  return value === "ingeklapt" ? "ingeklapt" : "uitgeklapt";
}
