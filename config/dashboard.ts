import { DEMO } from "@/lib/demo";

/** Vaste adressen van het dashboard; geen accountgegevens. */
export const config = {
  jiraSite: DEMO
    ? "https://jira.example"
    : "https://in10-rotterdam.atlassian.net",
  orbitSite: DEMO
    ? "https://orbit.example"
    : "https://norday.orbit.teamleader.eu",
};
