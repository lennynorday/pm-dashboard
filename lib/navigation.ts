import type { Platform } from "./dashboard";

export type NavAccount = {
  slug: string;
  naam: string;
  initialen: string;
  mijn: boolean;
};

export function initialen(naam: string): string {
  return naam
    .split(/\s+/)
    .filter((woord) => /^\p{L}/u.test(woord))
    .slice(0, 2)
    .map((woord) => woord.charAt(0).toUpperCase())
    .join("");
}

/**
 * Platforms met zichtbare projecten, in de vorm die het zijmenu nodig heeft.
 * Een platform zonder projecten staat er ook in, zodat je een net toegevoegd
 * platform kunt vinden.
 */
export function toNavAccounts(platforms: Platform[]): NavAccount[] {
  return platforms
    .filter(
      (platform) =>
        platform.projecten.length === 0 ||
        platform.projecten.some(
          (project) => project.zichtbaarheid === "zichtbaar",
        ),
    )
    .map((platform) => ({
      slug: platform.slug,
      naam: platform.naam,
      initialen: initialen(platform.naam),
      mijn: platform.mijn,
    }));
}

/** Een project heeft geen eigen pagina; het staat als regel op de platformpagina. */
export function projectHref(platformSlug: string, number: string): string {
  return `/platforms/${platformSlug}#project-${number}`;
}
