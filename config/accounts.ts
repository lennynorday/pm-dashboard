import type { DashboardConfig } from "./types";

/**
 * Jouw instellingen. Accounts en projecten komen uit Orbit; hier vul je aan
 * wat Orbit niet weet. Het type van een link mag je weglaten: Slack- en
 * Superhuman-links zijn dan intern, tenzij "gedeeld" in de titel staat.
 */
export const config: DashboardConfig = {
  eigenaar: "Lennart Ter Haar",
  jiraSite: "https://in10-rotterdam.atlassian.net",
  links: {
    inbox: "https://mail.google.com/mail/u/0/#inbox",
    todo: "https://docs.superhuman.com/d/_dbn7xvJsaKk/_su2ra91w",
  },
  accounts: {
    "centraal-museum-utrecht": {
      links: [
        {
          label: "CMU-kanaal",
          url: "https://norday-agency.slack.com/archives/C08NTBTUXAA",
        },
        {
          label: "CMU intern",
          url: "https://docs.superhuman.com/d/_dsOpoo6eGAx",
        },
        { label: "Website", url: "https://www.centraalmuseum.nl" },
      ],
    },
    "stichting-kunsthal-rotterdam": {
      links: [
        { label: "Website", url: "https://www.kunsthal.nl" },
        {
          label: "CMS acceptatie",
          url: "https://admin-acc.kunsthal.nl",
          type: "omgeving-acc",
        },
        {
          label: "CMS productie",
          url: "https://admin.kunsthal.nl",
          type: "omgeving-prod",
        },
      ],
    },
  },
  projecten: {
    "1607": { jiraKeys: ["CMU"] },
    "1728": { jiraKeys: ["KH"] },
  },
};
