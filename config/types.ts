import type { LinkInput } from "@/lib/links";

export type Contactpersoon = {
  naam: string;
  rol?: string;
  email?: string;
};

export type AccountConfig = {
  /** Laat leeg om de naam uit Orbit te gebruiken. */
  naam?: string;
  am?: string;
  contactpersonen?: Contactpersoon[];
  links?: LinkInput[];
};

export type ProjectConfig = {
  jiraKeys?: string[];
  links?: LinkInput[];
};

export type DashboardConfig = {
  /** Naam van de eigenaar in Orbit, zoals Orbit hem schrijft. */
  eigenaar: string;
  jiraSite: string;
  orbitSite: string;
  links: { inbox: string; todo: string };
  /** Sleutel: de klantnaam uit Orbit als slug, bijvoorbeeld "centraal-museum-utrecht". */
  accounts: Record<string, AccountConfig>;
  /** Sleutel: het projectnummer uit Orbit, bijvoorbeeld "1607". */
  projecten: Record<string, ProjectConfig>;
};
