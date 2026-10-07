import { ongekoppeld, type Platform } from "./dashboard";
import { formatDate } from "./format";
import type { AccountJira, ActieveSprint } from "./jira/overview";

export type SignaalType =
  "koppelen" | "sprint-verlopen" | "support-wacht" | "bron-fout";

/** Iets dat nu aandacht vraagt, met een link naar waar je het oplost. */
export type Signaal = {
  type: SignaalType;
  platformSlug: string;
  platformNaam: string;
  titel: string;
  detail: string;
  url: string;
};

export function isVerlopen(sprint: ActieveSprint, nu: Date): boolean {
  return sprint.einddatum !== null && new Date(sprint.einddatum) < nu;
}

/** Signalen van één platform uit zijn Jira- en supportdata. */
export function platformSignalen(
  platform: Pick<Platform, "slug" | "naam" | "klant">,
  { jira, support }: AccountJira,
  nu: Date,
): Signaal[] {
  const basis = { platformSlug: platform.slug, platformNaam: platform.naam };
  const los = ongekoppeld(platform.klant).length;
  const koppelSignalen: Signaal[] =
    los === 0
      ? []
      : [
          {
            ...basis,
            type: "koppelen",
            titel: `${los === 1 ? "1 project" : `${los} projecten`} van ${platform.klant.naam} ${los === 1 ? "hoort" : "horen"} nog bij geen platform`,
            detail: "Kies bij welke website elk project hoort",
            url: `/platforms/${platform.slug}/koppelen`,
          },
        ];

  const eerdere = [
    ...koppelSignalen,
    ...jira.flatMap(({ key, result }): Signaal[] => {
      if (result.status === "fout") {
        return [
          {
            ...basis,
            type: "bron-fout",
            titel: `Tickets van Jira ${key} konden niet worden opgehaald`,
            detail: result.message,
            url: `/platforms/${platform.slug}`,
          },
        ];
      }
      if (result.status !== "ok") return [];
      return result.data.actieveSprints
        .filter((sprint) => isVerlopen(sprint, nu))
        .map((sprint) => ({
          ...basis,
          type: "sprint-verlopen",
          titel: `Sprint "${sprint.naam}" is nog niet afgesloten`,
          detail: `Einddatum was ${formatDate((sprint.einddatum ?? "").slice(0, 10))}, Jira ${key}`,
          url: result.data.boardUrl,
        }));
    }),
  ];

  if (support?.status === "fout") {
    return [
      ...eerdere,
      {
        ...basis,
        type: "bron-fout",
        titel: "Supporttickets konden niet worden opgehaald",
        detail: support.message,
        url: `/platforms/${platform.slug}`,
      },
    ];
  }
  if (support?.status !== "ok" || support.data.opNorday.aantal === 0) {
    return eerdere;
  }
  const aantal = support.data.opNorday.aantal;
  return [
    ...eerdere,
    {
      ...basis,
      type: "support-wacht",
      titel:
        aantal === 1
          ? "1 supportticket wacht op een reactie van ons"
          : `${aantal} supporttickets wachten op een reactie van ons`,
      detail: `${support.data.open.aantal} open in Beheer & Support`,
      url: support.data.opNorday.url,
    },
  ];
}
