/** Delen van notulen: ontvangers, Slack-kanaal en wat er verstuurd is. Zonder database-import, zodat dit los te testen is en ook in client components mag. */
import type { Contactpersoon } from "./accountgegevens.ts";
import type { LinkUrls } from "./links.ts";
import { type Meeting, type Regel, TEAM } from "./meetings.ts";

/** De mail aan de klant, zoals de overlay hem voorinvult. */
export type MailInfo = {
  /** Standaard: de PO('s) uit de accountgegevens. */
  ontvangers: string[];
  /** De externe genodigden van de afspraak, voor "Aan alle genodigden". */
  genodigden: string[];
  onderwerp: string;
  tekst: string;
};

export type GeenKanaal = {
  soort: "geen-kanaal";
  melding: string;
  href: string;
  linkTekst: string;
};

export type SlackInfo =
  | {
      soort: "slack";
      /** Zoals in de knop: "#kanaal" of "het interne kanaal". */
      naam: string;
      /** Mag het Slack-token berichten plaatsen (chat:write)? */
      magSchrijven: boolean;
    }
  | GeenKanaal;

/** Wat de overlay nodig heeft om te delen: extern een mail en Slack, anders alleen Slack. */
export type DeelInfo = { mail: MailInfo | null; slack: SlackInfo };

/** Onzeker: het versturen liep in een time-out of netwerkfout, misschien is het toch aangekomen. */
export type OnderdeelStand = "open" | "verstuurd" | "overgeslagen" | "onzeker";

/** Een onderdeel van Delen (mail of Slack) met de link naar wat er verstuurd is. */
export type Onderdeel = { stand: OnderdeelStand; url: string | null };

/** De onderdelen van Delen: de mail aan de klant (alleen extern) en Slack. */
export type DeelOnderdeel = "mail" | "slack";

export const isDeelOnderdeel = (waarde: unknown): waarde is DeelOnderdeel =>
  waarde === "mail" || waarde === "slack";

/** Een onderdeel uit de database; een lege of onbekende stand is open. */
export const parseOnderdeel = (stand: unknown, url: unknown): Onderdeel => ({
  stand:
    stand === "verstuurd" || stand === "overgeslagen" || stand === "onzeker"
      ? stand
      : "open",
  url: typeof url === "string" ? url : null,
});

/** Hoe Delen eindigt: open zolang een onderdeel nog moet (of onzeker is), gedeeld als er iets verstuurd is, anders niet gedeeld. */
export function deelAfgerond(
  onderdelen: OnderdeelStand[],
): "open" | "gedeeld" | "niet" {
  if (onderdelen.some((stand) => stand === "open" || stand === "onzeker"))
    return "open";
  return onderdelen.includes("verstuurd") ? "gedeeld" : "niet";
}

/**
 * Een time-out of netwerkfout van fetch: het verzoek kan de server wel bereikt
 * hebben, dus het is onzeker of het gelukt is. Een HTTP-fout is dat niet.
 */
export const isNetwerkFout = (fout: unknown) =>
  fout instanceof TypeError ||
  (fout instanceof Error &&
    (fout.name === "AbortError" || fout.name === "TimeoutError"));

// Eenvoudig, zoals een adresveld: iets@iets.tld zonder spaties.
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i;

export const isEmail = (tekst: string) => EMAIL.test(tekst.trim());

/** Voegt adressen toe die er nog niet in staan (hoofdletterongevoelig). */
export function voegToe(lijst: string[], adressen: string[]): string[] {
  const uit = [...lijst];
  for (const adres of adressen.map((a) => a.trim())) {
    if (!uit.some((a) => a.toLowerCase() === adres.toLowerCase()))
      uit.push(adres);
  }
  return uit;
}

const PO_ROL = /^\s*(po|product\s*owner)\s*$/i;

/** De e-mailadressen van de contactpersonen met rol PO of Product owner. */
export function poAdressen(contactpersonen: Contactpersoon[]): string[] {
  return voegToe(
    [],
    contactpersonen.flatMap((persoon) =>
      PO_ROL.test(persoon.rol ?? "") && persoon.email && isEmail(persoon.email)
        ? [persoon.email]
        : [],
    ),
  );
}

/** De genodigden buiten het eigen domein. */
export const externeGenodigden = (deelnemers: string[], domein: string) =>
  deelnemers.filter(
    (email) => !email.toLowerCase().endsWith(`@${domein.toLowerCase()}`),
  );

/**
 * Het kanaal voor chat.postMessage: het id uit een Slack-link (`/archives/C…`
 * of `/client/T…/C…`), een los id, of een kanaalnaam ("#team" of "team").
 */
export function slackKanaal(
  waarde: string,
): { kanaal: string; naam: string | null } | null {
  const schoon = waarde.trim();
  const uitLink = /\/(?:archives|client\/[A-Z0-9]+)\/([CG][A-Z0-9]+)/.exec(
    schoon,
  )?.[1];
  if (uitLink) return { kanaal: uitLink, naam: null };
  if (/^[CG][A-Z0-9]{6,}$/.test(schoon)) return { kanaal: schoon, naam: null };
  const naam = schoon.replace(/^#/, "");
  if (/^[a-z0-9][a-z0-9_-]{0,79}$/.test(naam))
    return { kanaal: naam, naam: `#${naam}` };
  return null;
}

/**
 * Waar het Slack-bericht heen gaat: bij Team het kanaal van de serie
 * (Instellingen), bij een platform de link Slack intern. Anders een melding
 * met waar je het instelt.
 */
export function deelKanaal(
  meeting: Pick<Meeting, "hoort" | "label" | "serieId">,
  platforms: { slug: string; links: LinkUrls }[],
  regels: Regel[],
): { kanaal: string; naam: string } | GeenKanaal {
  if (meeting.hoort === TEAM) {
    const ingesteld = regels.find(
      (r) => r.soort === "serie" && r.sleutel === meeting.serieId,
    )?.kanaal;
    const kanaal = ingesteld ? slackKanaal(ingesteld) : null;
    if (kanaal)
      return { kanaal: kanaal.kanaal, naam: kanaal.naam ?? "het Team-kanaal" };
    return {
      soort: "geen-kanaal",
      melding: meeting.serieId
        ? "Deze Team-serie heeft nog geen Slack-kanaal. Kies het onder Instellingen, bij Team-overleggen."
        : "Een losse Team-meeting heeft geen Slack-kanaal. Kanalen stel je per serie in onder Instellingen.",
      href: "/instellingen#team-series",
      linkTekst: "Naar Instellingen",
    };
  }
  const link = platforms.find((p) => p.slug === meeting.hoort)?.links[
    "slack-intern"
  ];
  const kanaal = link ? slackKanaal(link) : null;
  if (kanaal)
    return { kanaal: kanaal.kanaal, naam: kanaal.naam ?? "het interne kanaal" };
  return {
    soort: "geen-kanaal",
    melding: `Bij ${meeting.label} staat geen geldige link naar het interne Slack-kanaal. Voeg die toe bij de gegevens van het platform.`,
    href: `/platforms/${encodeURIComponent(meeting.hoort)}/bewerken`,
    linkTekst: `Gegevens van ${meeting.label}`,
  };
}

/** Een thread in Gmail web; ook het hex-id van de API werkt daar. */
export const gmailThreadUrl = (email: string, threadId: string) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#all/${threadId}`;

const datumFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

/** Onderwerp en tekst van de mail aan de klant, met de link naar de notulen en de acties. */
export function conceptMail(
  meeting: { titel: string; start: string },
  paginaUrl: string,
  voornaam: string,
  acties: { eigenaar: string; wat: string }[],
): { onderwerp: string; tekst: string } {
  const datum = datumFormat.format(Date.parse(meeting.start));
  const lijst = acties.map((a) => `• ${a.eigenaar}: ${a.wat}`).join("\n");
  const actieBlok = lijst ? `Acties:\n${lijst}\n\n` : "";
  return {
    onderwerp: `Notulen ${meeting.titel} ${datum}`,
    tekst: `Hoi,\n\nDe notulen van ${meeting.titel} van ${datum} staan klaar:\n${paginaUrl}\n\n${actieBlok}Laat het weten als er iets niet klopt of ontbreekt.\n\nGroet,\n${voornaam}`,
  };
}
