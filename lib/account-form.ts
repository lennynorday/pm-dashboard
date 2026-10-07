import type { KlantVelden, PlatformGegevens } from "./accountgegevens";
import {
  EigenLink,
  LINK_TYPES,
  LinkType,
  LinkUrls,
  MAX_EIGEN_LINKS,
} from "./links";

/** Lege rijen onder de bestaande, om contactpersonen toe te voegen. */
export const LEGE_RIJEN = 2;

export type ContactRij = { naam: string; rol: string; email: string };

/** Wat er in het formulier staat, als tekst; ook na een fout, zodat niets verloren gaat. */
export type FormWaarden = {
  platform: string;
  naam: string;
  am: string;
  jiraKeys: string;
  supportOrganizations: string;
  contactpersonen: ContactRij[];
  links: Record<LinkType, string>;
  /** Altijd vier rijen; lege rijen tellen niet. */
  eigenLinks: EigenLink[];
};

/** Foutmelding per veld; de sleutel is de name van het invoerveld. */
export type FormFouten = Record<string, string>;

export type FormState = { fouten: FormFouten; waarden: FormWaarden } | null;

const LEGE_CONTACT: ContactRij = { naam: "", rol: "", email: "" };
const LEGE_LINK: EigenLink = { naam: "", url: "" };

/** Wat het formulier van een platform oplevert; rij en koppelingen blijven zoals ze waren. */
export type PlatformVelden = Omit<PlatformGegevens, "rijId" | "orbitProjecten">;

export function toFormWaarden(
  klant: KlantVelden,
  gegevens: PlatformVelden,
): FormWaarden {
  return {
    platform: gegevens.naam,
    naam: klant.naam ?? "",
    am: klant.am ?? "",
    jiraKeys: gegevens.jiraKeys.join(", "),
    supportOrganizations: gegevens.supportOrganizations.join(", "),
    contactpersonen: gegevens.contactpersonen.map((persoon) => ({
      naam: persoon.naam,
      rol: persoon.rol ?? "",
      email: persoon.email ?? "",
    })),
    links: Object.fromEntries(
      LINK_TYPES.map((type) => [type, gegevens.links[type] ?? ""]),
    ) as Record<LinkType, string>,
    eigenLinks: Array.from(
      { length: MAX_EIGEN_LINKS },
      (_, index) => gegevens.eigenLinks[index] ?? LEGE_LINK,
    ),
  };
}

/** Bestaande rijen plus lege rijen om iets toe te voegen. */
export function metLegeRijen(waarden: FormWaarden): FormWaarden {
  return {
    ...waarden,
    contactpersonen: [
      ...waarden.contactpersonen,
      ...Array<ContactRij>(LEGE_RIJEN).fill(LEGE_CONTACT),
    ],
  };
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function rijen<T>(
  formData: FormData,
  prefix: string,
  lees: (index: number) => T,
): T[] {
  const aantal = Number(text(formData, `${prefix}-aantal`)) || 0;
  return Array.from({ length: Math.min(aantal, 100) }, (_, index) =>
    lees(index),
  );
}

export function readFormWaarden(formData: FormData): FormWaarden {
  return {
    platform: text(formData, "platform"),
    naam: text(formData, "naam"),
    am: text(formData, "am"),
    jiraKeys: text(formData, "jiraKeys"),
    supportOrganizations: text(formData, "supportOrganizations"),
    contactpersonen: rijen(formData, "contact", (index) => ({
      naam: text(formData, `contact-${index}-naam`),
      rol: text(formData, `contact-${index}-rol`),
      email: text(formData, `contact-${index}-email`),
    })),
    links: Object.fromEntries(
      LINK_TYPES.map((type) => [type, text(formData, `link-${type}`)]),
    ) as Record<LinkType, string>,
    eigenLinks: Array.from({ length: MAX_EIGEN_LINKS }, (_, index) => ({
      naam: text(formData, `eigen-${index}-naam`),
      url: text(formData, `eigen-${index}-url`),
    })),
  };
}

function lijst(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const JIRA_KEY = /^[A-Z][A-Z0-9_]*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_START = /^https?:\/\/\S+$/;

const URL_FOUT =
  "Een link begint met https:// of http://, zoals https://www.kunsthal.nl.";

/** Controleert één eigen link; geeft de fout per veld, leeg als hij klopt. */
export function eigenLinkFouten(link: EigenLink): {
  naam?: string;
  url?: string;
} {
  return {
    ...(link.naam ? {} : { naam: "Vul een naam in, zoals Statuspagina." }),
    ...(URL_START.test(link.url) && URL.canParse(link.url)
      ? {}
      : { url: URL_FOUT }),
  };
}

/** Controleert het formulier; geeft de gegevens, of de fouten per veld. */
export function validateForm(
  waarden: FormWaarden,
):
  | { klant: Omit<KlantVelden, "zonderPlatform">; platform: PlatformVelden }
  | { fouten: FormFouten } {
  const fouten: FormFouten = {};

  if (!waarden.platform) {
    fouten.platform = "Vul de naam van het platform in, zoals Oorlogsbronnen.";
  }

  const jiraKeys = lijst(waarden.jiraKeys).map((key) => key.toUpperCase());
  const ongeldig = jiraKeys.filter((key) => !JIRA_KEY.test(key));
  if (ongeldig.length > 0) {
    fouten.jiraKeys = `Geen geldige Jira-key: ${ongeldig.join(", ")}. Een key bestaat uit hoofdletters en cijfers, zoals CMU.`;
  }

  const contactpersonen = waarden.contactpersonen.flatMap((rij, index) => {
    if (!rij.naam && !rij.rol && !rij.email) return [];
    if (!rij.naam) {
      fouten[`contact-${index}-naam`] =
        "Vul een naam in, of maak de hele rij leeg.";
    }
    if (rij.email && !EMAIL.test(rij.email)) {
      fouten[`contact-${index}-email`] =
        "Dit is geen geldig e-mailadres, zoals naam@museum.nl.";
    }
    return [
      {
        naam: rij.naam,
        rol: rij.rol || undefined,
        email: rij.email || undefined,
      },
    ];
  });

  const links: LinkUrls = Object.fromEntries(
    LINK_TYPES.flatMap((type) => {
      const url = waarden.links[type];
      if (!url) return [];
      if (!URL_START.test(url) || !URL.canParse(url)) {
        fouten[`link-${type}`] = URL_FOUT;
      }
      return [[type, url]];
    }),
  );

  const eigenLinks = waarden.eigenLinks.flatMap((link, index) => {
    if (!link.naam && !link.url) return [];
    const linkFouten = eigenLinkFouten(link);
    if (linkFouten.naam) fouten[`eigen-${index}-naam`] = linkFouten.naam;
    if (linkFouten.url) fouten[`eigen-${index}-url`] = linkFouten.url;
    return [link];
  });

  if (Object.keys(fouten).length > 0) return { fouten };
  return {
    klant: { naam: waarden.naam || undefined, am: waarden.am || undefined },
    platform: {
      naam: waarden.platform,
      jiraKeys,
      supportOrganizations: lijst(waarden.supportOrganizations),
      contactpersonen,
      links,
      eigenLinks,
    },
  };
}
