import type { AccountGegevens } from "./accountgegevens";
import { LINK_TYPES, LinkType } from "./links";

/** Lege rijen onder de bestaande, om contactpersonen en links toe te voegen. */
export const LEGE_RIJEN = 2;

export type ContactRij = { naam: string; rol: string; email: string };
export type LinkRij = { label: string; url: string; type: LinkType | "" };

/** Wat er in het formulier staat, als tekst; ook na een fout, zodat niets verloren gaat. */
export type FormWaarden = {
  naam: string;
  am: string;
  jiraKeys: string;
  supportOrganizations: string;
  contactpersonen: ContactRij[];
  links: LinkRij[];
};

/** Foutmelding per veld; de sleutel is de name van het invoerveld. */
export type FormFouten = Record<string, string>;

export type FormState = { fouten: FormFouten; waarden: FormWaarden } | null;

const LEGE_CONTACT: ContactRij = { naam: "", rol: "", email: "" };
const LEGE_LINK: LinkRij = { label: "", url: "", type: "" };

export function toFormWaarden(gegevens: AccountGegevens): FormWaarden {
  return {
    naam: gegevens.naam ?? "",
    am: gegevens.am ?? "",
    jiraKeys: gegevens.jiraKeys.join(", "),
    supportOrganizations: gegevens.supportOrganizations.join(", "),
    contactpersonen: gegevens.contactpersonen.map((persoon) => ({
      naam: persoon.naam,
      rol: persoon.rol ?? "",
      email: persoon.email ?? "",
    })),
    links: gegevens.links.map((link) => ({
      label: link.label,
      url: link.url,
      type: link.type ?? "",
    })),
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
    links: [...waarden.links, ...Array<LinkRij>(LEGE_RIJEN).fill(LEGE_LINK)],
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
    naam: text(formData, "naam"),
    am: text(formData, "am"),
    jiraKeys: text(formData, "jiraKeys"),
    supportOrganizations: text(formData, "supportOrganizations"),
    contactpersonen: rijen(formData, "contact", (index) => ({
      naam: text(formData, `contact-${index}-naam`),
      rol: text(formData, `contact-${index}-rol`),
      email: text(formData, `contact-${index}-email`),
    })),
    links: rijen(formData, "link", (index) => ({
      label: text(formData, `link-${index}-label`),
      url: text(formData, `link-${index}-url`),
      type:
        LINK_TYPES.find(
          (type) => type === text(formData, `link-${index}-type`),
        ) ?? "",
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

/** Controleert het formulier; geeft de gegevens, of de fouten per veld. */
export function validateForm(
  waarden: FormWaarden,
): { gegevens: AccountGegevens } | { fouten: FormFouten } {
  const fouten: FormFouten = {};

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

  const links = waarden.links.flatMap((rij, index) => {
    if (!rij.label && !rij.url) return [];
    if (!rij.label) {
      fouten[`link-${index}-label`] =
        "Vul een titel in, of maak de hele rij leeg.";
    }
    if (!URL_START.test(rij.url)) {
      fouten[`link-${index}-url`] =
        "Een link begint met https:// of http://, zoals https://www.kunsthal.nl.";
    }
    return [{ label: rij.label, url: rij.url, type: rij.type || undefined }];
  });

  if (Object.keys(fouten).length > 0) return { fouten };
  return {
    gegevens: {
      naam: waarden.naam || undefined,
      am: waarden.am || undefined,
      jiraKeys,
      supportOrganizations: lijst(waarden.supportOrganizations),
      contactpersonen,
      links,
    },
  };
}
