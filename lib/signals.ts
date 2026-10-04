import type { Account } from "./dashboard";
import { formatDate } from "./format";
import type { AccountJira, ActieveSprint } from "./jira/overview";

export type SignaalType = "sprint-verlopen" | "support-wacht" | "bron-fout";

/** Iets dat nu aandacht vraagt, met een link naar waar je het oplost. */
export type Signaal = {
  type: SignaalType;
  accountSlug: string;
  accountNaam: string;
  titel: string;
  detail: string;
  url: string;
};

export function isVerlopen(sprint: ActieveSprint, nu: Date): boolean {
  return sprint.einddatum !== null && new Date(sprint.einddatum) < nu;
}

/** Signalen van één account uit zijn Jira- en supportdata. */
export function accountSignalen(
  account: Pick<Account, "slug" | "naam">,
  { jira, support }: AccountJira,
  nu: Date,
): Signaal[] {
  const basis = { accountSlug: account.slug, accountNaam: account.naam };

  const jiraSignalen = jira.flatMap(({ key, result }): Signaal[] => {
    if (result.status === "fout") {
      return [
        {
          ...basis,
          type: "bron-fout",
          titel: `Jira ${key} niet opgehaald`,
          detail: result.message,
          url: `/accounts/${account.slug}`,
        },
      ];
    }
    if (result.status !== "ok") return [];
    return result.data.actieveSprints
      .filter((sprint) => isVerlopen(sprint, nu))
      .map((sprint) => ({
        ...basis,
        type: "sprint-verlopen",
        titel: `Sprint "${sprint.naam}" is verlopen`,
        detail: `Einde ${formatDate((sprint.einddatum ?? "").slice(0, 10))}, nog open in Jira ${key}`,
        url: result.data.boardUrl,
      }));
  });

  if (support?.status === "fout") {
    return [
      ...jiraSignalen,
      {
        ...basis,
        type: "bron-fout",
        titel: "Support niet opgehaald",
        detail: support.message,
        url: `/accounts/${account.slug}`,
      },
    ];
  }
  if (support?.status !== "ok" || support.data.opNorday.aantal === 0) {
    return jiraSignalen;
  }
  const aantal = support.data.opNorday.aantal;
  return [
    ...jiraSignalen,
    {
      ...basis,
      type: "support-wacht",
      titel:
        aantal === 1
          ? "1 supportticket wacht op ons"
          : `${aantal} supporttickets wachten op ons`,
      detail: `Beheer & Support, ${support.data.open.aantal} open in totaal`,
      url: support.data.opNorday.url,
    },
  ];
}
