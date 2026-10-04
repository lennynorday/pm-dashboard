import type { Account } from "./dashboard";

export type NavProject = { number: string; naam: string };

export type NavAccount = {
  slug: string;
  naam: string;
  initialen: string;
  projecten: NavProject[];
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
    .map((account) => ({
      slug: account.slug,
      naam: account.naam,
      initialen: initialen(account.naam),
      projecten: account.projecten
        .filter((project) => project.zichtbaarheid === "zichtbaar")
        .map((project) => ({ number: project.number, naam: project.naam })),
    }))
    .filter((account) => account.projecten.length > 0);
}
