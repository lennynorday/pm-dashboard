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
  "overig",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export type Link = {
  type: LinkType;
  label: string;
  url: string;
};

/** Zoals een link in de config staat: het type mag je weglaten. */
export type LinkInput = {
  label: string;
  url: string;
  type?: LinkType;
};

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
  overig: "Overig",
};

/** Slack en Superhuman zijn intern, tenzij "gedeeld" in de titel staat. */
function inferType(label: string, url: string): LinkType {
  const shared = /gedeeld/i.test(label);
  if (/slack\.com/i.test(url)) return shared ? "slack-klant" : "slack-intern";
  if (/superhuman\.com|coda\.io/i.test(url)) {
    return shared ? "superhuman-gedeeld" : "superhuman-intern";
  }
  if (/atlassian\.net/i.test(url)) return "jira-board";
  if (/drive\.google|docs\.google/i.test(url)) return "drive";
  return "overig";
}

export function toLink(input: LinkInput): Link {
  return {
    type: input.type ?? inferType(input.label, input.url),
    label: input.label,
    url: input.url,
  };
}

export type LinkGroup = { type: LinkType; links: Link[] };

/** Groepeert links per type, in de volgorde van LINK_TYPES. */
export function groupLinks(links: Link[]): LinkGroup[] {
  return LINK_TYPES.map((type) => ({
    type,
    links: links.filter((link) => link.type === type),
  })).filter((group) => group.links.length > 0);
}
