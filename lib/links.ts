export const LINK_TYPES = [
  "slack-intern",
  "slack-klant",
  "superhuman-intern",
  "superhuman-gedeeld",
  "jira-board",
  "drive",
  "figma",
  "claude-project",
  "omgeving-acc",
  "omgeving-prod",
  "cms-acc",
  "cms-prod",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export type Link = {
  type: LinkType;
  label: string;
  url: string;
};

/** Per type hooguit één link, zoals in de tabel in Superhuman. */
export type LinkUrls = Partial<Record<LinkType, string>>;

/** Een link die de PM zelf bij een platform zet, met een eigen naam. */
export type EigenLink = { naam: string; url: string };

export const MAX_EIGEN_LINKS = 4;

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  "slack-intern": "Slack intern",
  "slack-klant": "Slack met klant",
  "superhuman-intern": "Superhuman intern",
  "superhuman-gedeeld": "Superhuman gedeeld",
  "jira-board": "Jira",
  drive: "Drive",
  figma: "Figma",
  "claude-project": "Claude project",
  "omgeving-acc": "Acceptatie",
  "omgeving-prod": "Productie",
  "cms-acc": "CMS acceptatie",
  "cms-prod": "CMS productie",
};

/** De vaste indeling op de platformpagina; Overig bevat de eigen links. */
export const LINK_GROEPEN: { naam: string; typen: LinkType[] }[] = [
  {
    naam: "Samenwerken",
    typen: [
      "slack-intern",
      "slack-klant",
      "superhuman-intern",
      "superhuman-gedeeld",
    ],
  },
  { naam: "Tools", typen: ["jira-board", "drive", "figma", "claude-project"] },
  {
    naam: "Omgevingen",
    typen: ["omgeving-acc", "omgeving-prod", "cms-acc", "cms-prod"],
  },
];

/** De links van een platform, met de host als titel. */
export function toLinks(urls: LinkUrls): Link[] {
  return LINK_TYPES.flatMap((type) => {
    const url = urls[type];
    return url ? [{ type, label: new URL(url).host, url }] : [];
  });
}

/** Eén per regel: "Naam https://adres"; regels zonder geldig adres vallen weg. */
export function parseEigenLinks(waarde: string): EigenLink[] {
  return waarde
    .split("\n")
    .flatMap((regel) => {
      const url = /https?:\/\/\S+$/.exec(regel.trim())?.[0];
      if (!url || !URL.canParse(url)) return [];
      const naam = regel.trim().slice(0, -url.length).trim();
      return [{ naam: naam || new URL(url).host, url }];
    })
    .slice(0, MAX_EIGEN_LINKS);
}

export function formatEigenLinks(links: EigenLink[]): string {
  return links.map((link) => `${link.naam} ${link.url}`).join("\n");
}
