import type { Account, Project } from "./dashboard";
import { formatDate, formatUren } from "./format";
import type { AccountJira } from "./jira/overview";
import { plafond, type ProjectBudgetResult } from "./orbit/budget";
import { isVerlopen } from "./signals";

export type FeedSoort =
  "boven-offerte" | "bijna-op" | "eerste-reactie" | "sprint-verlopen";

/** Iets in Mijn feed. Het id verandert als de situatie verandert, zodat een genegeerd item terugkomt. */
export type FeedItem = {
  id: string;
  soort: FeedSoort;
  accountSlug: string;
  accountNaam: string;
  titel: string;
  detail: string;
  url: string;
};

export type FeedBron = {
  account: Account;
  jira: AccountJira;
  projecten: { project: Project; budget: ProjectBudgetResult }[];
};

const VOLGORDE: FeedSoort[] = [
  "boven-offerte",
  "bijna-op",
  "eerste-reactie",
  "sprint-verlopen",
];

function budgetItems({ account, projecten }: FeedBron): FeedItem[] {
  return projecten.flatMap(({ project, budget }): FeedItem[] => {
    if (budget.status !== "ok") return [];
    const { minuten, soort } = plafond(budget.data);
    if (minuten === 0) return [];
    const geschreven = budget.data.geschreven;
    const percentage = Math.round((geschreven / minuten) * 100);
    const basis = {
      accountSlug: account.slug,
      accountNaam: account.naam,
      detail: `${formatUren(geschreven)} van ${formatUren(minuten)} uur ${soort} (${percentage}%)`,
      url: `#project-${project.number}`,
    };
    if (percentage > 100) {
      return [
        {
          ...basis,
          id: `boven-offerte:${project.number}`,
          soort: "boven-offerte",
          titel: `${project.naam}: +${formatUren(geschreven - minuten)} uur boven ${soort}`,
        },
      ];
    }
    if (percentage > 80) {
      return [
        {
          ...basis,
          id: `bijna-op:${project.number}`,
          soort: "bijna-op",
          titel: `${project.naam}: ${percentage}% verbruikt`,
        },
      ];
    }
    return [];
  });
}

function jiraItems({ account, jira }: FeedBron, nu: Date): FeedItem[] {
  const basis = { accountSlug: account.slug, accountNaam: account.naam };
  const sprints = jira.jira.flatMap(({ key, result }): FeedItem[] => {
    if (result.status !== "ok") return [];
    return result.data.actieveSprints
      .filter((sprint) => isVerlopen(sprint, nu))
      .map((sprint) => ({
        ...basis,
        id: `sprint-verlopen:${key}:${sprint.naam}`,
        soort: "sprint-verlopen",
        titel: `Sprint "${sprint.naam}" is nog niet afgesloten`,
        detail: `Einddatum was ${formatDate((sprint.einddatum ?? "").slice(0, 10))}, Jira ${key}`,
        url: result.data.boardUrl,
      }));
  });
  const { support } = jira;
  if (support?.status !== "ok" || support.data.eersteReactie.aantal === 0) {
    return sprints;
  }
  const aantal = support.data.eersteReactie.aantal;
  return [
    ...sprints,
    {
      ...basis,
      id: `eerste-reactie:${account.slug}:${aantal}`,
      soort: "eerste-reactie",
      titel:
        aantal === 1
          ? "1 ticket wacht op een eerste reactie"
          : `${aantal} tickets wachten op een eerste reactie`,
      detail: "Waiting for first response in Beheer & Support",
      url: support.data.eersteReactie.url,
    },
  ];
}

/** Alles wat aandacht vraagt, belangrijkste soort eerst. */
export function bouwFeed(bronnen: FeedBron[], nu: Date): FeedItem[] {
  return bronnen
    .flatMap((bron) => [...budgetItems(bron), ...jiraItems(bron, nu)])
    .sort((a, b) => VOLGORDE.indexOf(a.soort) - VOLGORDE.indexOf(b.soort));
}
