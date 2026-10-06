import type { Account } from "./dashboard";

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

/** Accounts met zichtbare projecten, in de vorm die het zijmenu nodig heeft. */
export function toNavAccounts(accounts: Account[]): NavAccount[] {
  return accounts
    .filter((account) =>
      account.projecten.some(
        (project) => project.zichtbaarheid === "zichtbaar",
      ),
    )
    .map((account) => ({
      slug: account.slug,
      naam: account.naam,
      initialen: initialen(account.naam),
      mijn: account.mijn,
    }));
}

/** Een project heeft geen eigen pagina; het staat als regel op de accountpagina. */
export function projectHref(accountSlug: string, number: string): string {
  return `/accounts/${accountSlug}#project-${number}`;
}
