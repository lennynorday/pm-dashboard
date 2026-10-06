import { ongekoppeld, type Platform, type Project } from "./dashboard";
import { formatDate, formatUren } from "./format";
import type { AccountJira } from "./jira/overview";
import { plafond, type ProjectBudgetResult } from "./orbit/budget";
import { isVerlopen, koppelTitel } from "./signals";

export type FeedSoort =
  | "boven-offerte"
  | "bijna-op"
  | "koppelen"
  | "eerste-reactie"
  | "sprint-verlopen";

/** Iets in Mijn feed. Het id verandert als de situatie verandert, zodat een genegeerd item terugkomt. */
export type FeedItem = {
  id: string;
  soort: FeedSoort;
  platformSlug: string;
  platformNaam: string;
  /** Alleen bij een klant met meer platforms. */
  klantNaam: string | null;
  titel: string;
  detail: string;
  url: string;
};

export type FeedBron = {
  platform: Platform;
  jira: AccountJira;
  projecten: { project: Project; budget: ProjectBudgetResult }[];
};

const VOLGORDE: FeedSoort[] = [
  "boven-offerte",
  "bijna-op",
  "koppelen",
  "eerste-reactie",
  "sprint-verlopen",
];

function waar(
  platform: Platform,
): Pick<FeedItem, "platformSlug" | "platformNaam" | "klantNaam"> {
  return {
    platformSlug: platform.slug,
    platformNaam: platform.naam,
    klantNaam: platform.klant.meerPlatforms ? platform.klant.naam : null,
  };
}

function budgetItems({ platform, projecten }: FeedBron): FeedItem[] {
  return projecten.flatMap(({ project, budget }): FeedItem[] => {
    if (budget.status !== "ok") return [];
    const { minuten, soort } = plafond(budget.data);
    if (minuten === 0) return [];
    const geschreven = budget.data.geschreven;
    const percentage = Math.round((geschreven / minuten) * 100);
    const basis = {
      ...waar(platform),
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

function jiraItems({ platform, jira }: FeedBron, nu: Date): FeedItem[] {
  const basis = waar(platform);
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
      id: `eerste-reactie:${platform.slug}:${aantal}`,
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

/**
 * Eén item per klant met projecten die nog nergens bij horen, als ik eigenaar
 * ben van zo'n project of PM van een van zijn platforms.
 */
export function koppelItems(platforms: Platform[]): FeedItem[] {
  const klanten = [...new Set(platforms.map((platform) => platform.klant))];
  return klanten.flatMap((klant): FeedItem[] => {
    const vanKlant = platforms.filter((platform) => platform.klant === klant);
    // Het eerste platform waar ik PM van ben, anders het eerste van de klant.
    const platform = vanKlant.find((item) => item.mijn) ?? vanKlant[0];
    const los = ongekoppeld(klant);
    const mijn =
      los.some((project) => project.mijn) || vanKlant.some((item) => item.mijn);
    if (los.length === 0 || !mijn) return [];
    return [
      {
        id: `koppelen:${klant.orbitId}:${los.map((project) => project.number).join(",")}`,
        soort: "koppelen",
        ...waar(platform),
        titel: koppelTitel(los.length, klant.naam),
        detail: "Kies per project de website, of \u201cgeen platform\u201d",
        url: `/platforms/${platform.slug}/koppelen`,
      },
    ];
  });
}

/** Alles wat aandacht vraagt, belangrijkste soort eerst. */
export function bouwFeed(
  bronnen: FeedBron[],
  platforms: Platform[],
  nu: Date,
): FeedItem[] {
  return [
    ...koppelItems(platforms),
    ...bronnen.flatMap((bron) => [
      ...budgetItems(bron),
      ...jiraItems(bron, nu),
    ]),
  ].sort((a, b) => VOLGORDE.indexOf(a.soort) - VOLGORDE.indexOf(b.soort));
}
