export const LINK_TYPES = [
  "superhuman-intern",
  "superhuman-gedeeld",
  "slack-intern",
  "slack-klant",
  "jira-board",
  "drive",
  "offerte",
  "omgeving-acc",
  "omgeving-prod",
  "cms-acc",
  "cms-prod",
  "overig",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export type Link = {
  type: LinkType;
  label: string;
  url: string;
};

/** Per type hooguit één link, zoals in de tabel in Superhuman. */
export type LinkUrls = Partial<Record<LinkType, string>>;

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  "superhuman-intern": "Superhuman intern",
  "superhuman-gedeeld": "Superhuman gedeeld",
  "slack-intern": "Slack intern",
  "slack-klant": "Slack met klant",
  "jira-board": "Jira",
  drive: "Drive",
  offerte: "Offerte",
  "omgeving-acc": "Acceptatie",
  "omgeving-prod": "Productie",
  "cms-acc": "CMS acceptatie",
  "cms-prod": "CMS productie",
  overig: "Overig",
};

/** De links van een account, met de host als titel. */
export function toLinks(urls: LinkUrls): Link[] {
  return LINK_TYPES.flatMap((type) => {
    const url = urls[type];
    return url ? [{ type, label: new URL(url).host, url }] : [];
  });
}

export type LinkGroup = { type: LinkType; links: Link[] };

/** Groepeert links per type, in de volgorde van LINK_TYPES. */
export function groupLinks(links: Link[]): LinkGroup[] {
  return LINK_TYPES.map((type) => ({
    type,
    links: links.filter((link) => link.type === type),
  })).filter((group) => group.links.length > 0);
}
