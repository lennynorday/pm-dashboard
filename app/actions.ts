"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import {
  eigenLinkFouten,
  FormState,
  readFormWaarden,
  validateForm,
} from "@/lib/account-form";
import {
  clearAccountGegevensCache,
  saveKoppelingen,
  savePlatformGegevens,
} from "@/lib/accountgegevens";
import { type KlantProject, loadDashboard, slugify } from "@/lib/dashboard";
import {
  LINK_TYPE_LABELS,
  LINK_TYPES,
  type LinkType,
  MAX_EIGEN_LINKS,
} from "@/lib/links";
import { herstel, herstelAlles, negeer } from "@/lib/genegeerde-meldingen";
import { hideProject, showProject } from "@/lib/hidden-projects";
import { clearJiraCache } from "@/lib/jira/overview";
import { BRONNEN, deleteKoppeling, isVerbonden } from "@/lib/koppelingen";
import { clearBudgetCache } from "@/lib/orbit/budget";
import { clearProjectCache } from "@/lib/orbit/projects";
import { currentUser, SESSIE_COOKIE, stopSessie } from "@/lib/session";
import {
  bewaarRegel,
  slaOver,
  verwijderMeetingRegel,
  zetKanaal,
  zetTerug,
} from "@/lib/meeting-regels";
import { PRIVE, TEAM, titelWoord } from "@/lib/meetings";
import { normaliseerRoepnamen, roepnaamConflict } from "@/lib/roepnamen";
import {
  deelInSlack,
  eldersGedeeld,
  herstelNotulen,
  bevestigVerstuurd,
  heropenOnderdeel,
  nietDelen,
  NOTULEN_UIT,
  notulenAan,
  notulenPlatforms,
  opnameKeuzes,
  slaOnderdeelOver,
  stuurDeelMail,
  tochDelen,
  verwerkNotulen,
  ververs,
  zetOpname,
} from "@/lib/notulen";
import { isDeelOnderdeel, isEmail } from "@/lib/notulen-delen";
import type { OpnameKeuzes } from "@/lib/notulen-stand";
import {
  GmailComposeOntbreektError,
  GmailNietVerbondenError,
} from "@/lib/gmail/api";
import {
  SlackNietVerbondenError,
  SlackSchrijvenOntbreektError,
  slackMagDm,
} from "@/lib/slack/api";
import {
  type HerinnerVoorstel,
  actieNaarTodo,
  herinner,
  herinnerVoorstel,
  zetActieStatus,
} from "@/lib/actiepunten";
import { type AkkoordUitkomst, geefAkkoord } from "@/lib/akkoord";
import { draaiOpdracht } from "@/lib/claude/draai";
import { soortVoorBron } from "@/lib/claude/voorstel";
import { synchroniseerGmail } from "@/lib/gmail/sync";
import { bronAan, staToe, sluitUit, zetBron } from "@/lib/inbox-bronnen";
import { synchroniseerSlack } from "@/lib/slack/sync";
import {
  type FeedTodo,
  domeinVan,
  MAX_TITEL,
  parseInboxBron,
  parseLijst,
  parsePrio,
  parseStatus,
} from "@/lib/taak";
import {
  herstart,
  maakOpdracht,
  startAanpassing,
  zetBesluit,
} from "@/lib/opdrachten";
import {
  hernoem,
  naarTodo,
  leesTaak,
  leesTaken,
  nieuweTaak,
  verplaats,
  verwijderFeedTodo,
  voegFeedToe,
  zetGezien,
  zetPrio,
  zetStatus,
  zetVolgorde,
} from "@/lib/todos";

/** Haalt alles opnieuw op: Orbit, Jira en de accountgegevens uit Superhuman. */
export async function refreshData(): Promise<void> {
  clearProjectCache();
  clearBudgetCache();
  clearJiraCache();
  clearAccountGegevensCache();
  revalidatePath("/", "layout");
}

export async function hideProjectAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const number = formData.get("projectnummer");
  if (!user || typeof number !== "string") return;
  hideProject(user.email, number);
  revalidatePath("/", "layout");
}

export async function showProjectAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const number = formData.get("projectnummer");
  if (!user || typeof number !== "string") return;
  showProject(user.email, number);
  revalidatePath("/", "layout");
}

export async function negeerMeldingAction(id: string): Promise<void> {
  const user = await currentUser();
  if (!user || typeof id !== "string") return;
  negeer(user.email, id);
  revalidatePath("/");
}

/** Ongedaan maken van negeren: de melding staat weer in Mijn feed. */
export async function herstelMeldingAction(id: string): Promise<void> {
  const user = await currentUser();
  if (!user || typeof id !== "string") return;
  herstel(user.email, id);
  revalidatePath("/");
}

export async function herstelMeldingenAction(): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  herstelAlles(user.email);
  revalidatePath("/");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSIE_COOKIE)?.value;
  if (id) stopSessie(id);
  cookieStore.delete(SESSIE_COOKIE);
  redirect("/");
}

export async function ontkoppelAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const bron = BRONNEN.find((item) => item === formData.get("bron"));
  if (!user || !bron) return;
  deleteKoppeling(user.email, bron);
  // Wat met het oude token is opgehaald, hoort niet te blijven staan.
  clearProjectCache();
  clearBudgetCache();
  clearJiraCache();
  revalidatePath("/", "layout");
}

/** Haalt de accountgegevens meteen opnieuw uit Superhuman. */
export async function refreshAccountGegevensAction(): Promise<void> {
  if (!(await currentUser())) return;
  clearAccountGegevensCache();
  revalidatePath("/", "layout");
}

/**
 * Slaat een platform op; `nieuw` voegt een platform toe aan de klant van het
 * platform met deze slug. Bij fouten blijft alles staan wat is ingevuld.
 */
async function savePlatform(
  slug: string,
  nieuw: boolean,
  formData: FormData,
): Promise<FormState> {
  if (!(await currentUser()) || !/^[a-z0-9-]+$/.test(slug)) redirect("/");
  const waarden = readFormWaarden(formData);
  const uitkomst = validateForm(waarden);
  if ("fouten" in uitkomst) return { fouten: uitkomst.fouten, waarden };

  const dashboard = await loadDashboard();
  const platform =
    dashboard.status === "ok"
      ? dashboard.platforms.find((item) => item.slug === slug)
      : undefined;
  const orbitId = platform?.klant.orbitId;
  if (!platform || !orbitId || dashboard.status !== "ok") {
    return {
      fouten: {
        opslaan:
          "Deze klant is niet in Orbit gevonden, dus het platform kan niet worden opgeslagen.",
      },
      waarden,
    };
  }

  // Orbit-id plus naam is de sleutel van de rij, dus de naam moet uniek zijn binnen de klant.
  const naam = uitkomst.platform.naam;
  const dubbel = dashboard.platforms.some(
    (item) =>
      item.klant.orbitId === orbitId &&
      (nieuw || item.slug !== slug) &&
      item.naam.toLowerCase() === naam.toLowerCase(),
  );
  if (dubbel) {
    return {
      fouten: {
        platform: `${platform.klant.naam} heeft al een platform ${naam}. Kies een andere naam.`,
      },
      waarden,
    };
  }

  const conflict = roepnaamConflict(
    uitkomst.platform.roepnamen,
    dashboard.platforms
      .filter((item) => nieuw || item.slug !== slug)
      .map((item) => ({
        naam: item.naam,
        roepnamen: item.gegevens.roepnamen,
      })),
  );
  if (conflict) return { fouten: { roepnamen: conflict }, waarden };

  try {
    await savePlatformGegevens(
      orbitId,
      platform.klant.orbitNaam,
      {
        ...uitkomst.klant,
        zonderPlatform: platform.klant.velden.zonderPlatform,
      },
      nieuw
        ? uitkomst.platform
        : { ...uitkomst.platform, rijId: platform.gegevens.rijId },
      nieuw ? null : platform.gegevens.naam,
    );
  } catch (error) {
    return {
      fouten: {
        opslaan: `Opslaan in Superhuman is mislukt. ${error instanceof Error ? error.message : String(error)}`,
      },
      waarden,
    };
  }
  revalidatePath("/", "layout");
  redirect(`/platforms/${slugify(naam)}`);
}

export async function savePlatformAction(
  slug: string,
  _vorige: FormState,
  formData: FormData,
): Promise<FormState> {
  return savePlatform(slug, false, formData);
}

export async function addPlatformAction(
  slug: string,
  _vorige: FormState,
  formData: FormData,
): Promise<FormState> {
  return savePlatform(slug, true, formData);
}

/** Waar een project bij hoort: de naam van een platform, "geen", of nog niets. */
type Keuze = { platform: string } | "geen" | null;

/**
 * Slaat voor alle projecten van de klant van dit platform op waar ze bij horen.
 * Een fout komt terug als tekst; bij succes null.
 */
async function bewaarKoppelingen(
  slug: string,
  keuze: (project: KlantProject) => Keuze,
): Promise<string | null> {
  if (!(await currentUser()) || !/^[a-z0-9-]+$/.test(slug)) redirect("/");
  const dashboard = await loadDashboard();
  if (dashboard.status !== "ok") return "Orbit is niet bereikbaar.";
  if (dashboard.gegevensFout) {
    return `De accountgegevens konden niet uit Superhuman worden opgehaald. ${dashboard.gegevensFout}`;
  }
  const platform = dashboard.platforms.find((item) => item.slug === slug);
  const orbitId = platform?.klant.orbitId;
  if (!platform || !orbitId) return "Deze klant is niet in Orbit gevonden.";

  const { klant } = platform;
  const keuzes = klant.projecten.map((project) => ({
    number: project.number,
    keuze: keuze(project),
  }));
  const zusters = dashboard.platforms.filter((item) => item.klant === klant);
  try {
    await saveKoppelingen(
      orbitId,
      klant.orbitNaam,
      {
        ...klant.velden,
        zonderPlatform: keuzes
          .filter((item) => item.keuze === "geen")
          .map((item) => item.number),
      },
      zusters.map((zuster) => ({
        ...zuster.gegevens,
        naam: zuster.naam,
        orbitProjecten: [
          // Projecten van een andere klant staan hier niet in de keuzes.
          ...zuster.gegevens.orbitProjecten.filter(
            (number) => !keuzes.some((item) => item.number === number),
          ),
          ...keuzes
            .filter(
              (item) =>
                typeof item.keuze === "object" &&
                item.keuze?.platform === zuster.naam,
            )
            .map((item) => item.number),
        ],
      })),
    );
  } catch (error) {
    return `Opslaan in Superhuman is mislukt. ${error instanceof Error ? error.message : String(error)}`;
  }
  revalidatePath("/", "layout");
  return null;
}

/** Wat er nu staat, zodat een project zonder keuze blijft zoals het was. */
function huidig(project: KlantProject): Keuze {
  if (project.zonderPlatform) return "geen";
  return project.platform === null ? null : { platform: project.platform };
}

export type KoppelState = { fout: string } | null;

/** Het koppelscherm: per project een platform of "geen platform". */
export async function koppelAction(
  slug: string,
  _vorige: KoppelState,
  formData: FormData,
): Promise<KoppelState> {
  const fout = await bewaarKoppelingen(slug, (project) => {
    const waarde = formData.get(`project-${project.number}`);
    if (waarde === "geen") return "geen";
    if (typeof waarde === "string" && waarde.startsWith("platform:")) {
      return { platform: waarde.slice("platform:".length) };
    }
    return huidig(project);
  });
  if (fout) return { fout };
  redirect(`/platforms/${slug}`);
}

/** Haalt één project van zijn platform af; daarna is het weer te koppelen. */
export async function ontkoppelProjectAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  const nummer = formData.get("projectnummer");
  const fout = await bewaarKoppelingen(slug, (project) =>
    project.number === nummer ? null : huidig(project),
  );
  if (fout) throw new Error(fout);
}

export type LinkState = {
  fouten: { naam?: string; url?: string; opslaan?: string };
  waarden: { naam: string; url: string };
} | null;

/**
 * Zet een link bij een platform: een eigen link met naam onder Overig, of een
 * vast linktype dat nog leeg is. Daarna staat hij er meteen.
 */
export async function addLinkAction(
  slug: string,
  soort: LinkType | "eigen",
  _vorige: LinkState,
  formData: FormData,
): Promise<LinkState> {
  if (
    !(await currentUser()) ||
    !/^[a-z0-9-]+$/.test(slug) ||
    !(soort === "eigen" || LINK_TYPES.includes(soort))
  ) {
    redirect("/");
  }
  const lees = (name: string) => {
    const waarde = formData.get(name);
    return typeof waarde === "string" ? waarde.trim() : "";
  };
  const link = {
    naam: soort === "eigen" ? lees("naam") : LINK_TYPE_LABELS[soort],
    url: lees("url"),
  };
  const fouten = eigenLinkFouten(link);
  if (fouten.naam || fouten.url) return { fouten, waarden: link };

  const dashboard = await loadDashboard();
  const platform =
    dashboard.status === "ok"
      ? dashboard.platforms.find((item) => item.slug === slug)
      : undefined;
  const orbitId = platform?.klant.orbitId;
  const opslaan = (melding: string): LinkState => ({
    fouten: { opslaan: melding },
    waarden: link,
  });
  if (!platform || !orbitId || dashboard.status !== "ok") {
    return opslaan("Dit platform is niet in Orbit gevonden.");
  }
  // Zonder actuele gegevens zou opslaan wat er in Superhuman staat overschrijven.
  if (dashboard.gegevensFout) {
    return opslaan(
      `De accountgegevens konden niet uit Superhuman worden opgehaald. ${dashboard.gegevensFout}`,
    );
  }
  if (soort === "eigen" && platform.eigenLinks.length >= MAX_EIGEN_LINKS) {
    return opslaan(
      `Er staan al ${MAX_EIGEN_LINKS} eigen links bij dit platform.`,
    );
  }
  if (soort !== "eigen" && platform.gegevens.links[soort]) {
    return opslaan(
      `Er staat al een link voor ${LINK_TYPE_LABELS[soort]}; wijzig hem via Gegevens bewerken.`,
    );
  }
  try {
    await savePlatformGegevens(
      orbitId,
      platform.klant.orbitNaam,
      platform.klant.velden,
      soort === "eigen"
        ? {
            ...platform.gegevens,
            naam: platform.naam,
            eigenLinks: [...platform.eigenLinks, link],
          }
        : {
            ...platform.gegevens,
            naam: platform.naam,
            links: { ...platform.gegevens.links, [soort]: link.url },
          },
      platform.gegevens.naam,
    );
  } catch (error) {
    return opslaan(
      `Opslaan in Superhuman is mislukt. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  revalidatePath("/", "layout");
  return null;
}

/** De tellers in het zijmenu staan in de layout, dus die verversen mee. */
async function bijTaken(doe: (email: string) => void): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  doe(user.email);
  revalidatePath("/", "layout");
}

export async function verplaatsTaakAction(
  id: number,
  lijst: string,
): Promise<void> {
  const naar = parseLijst(lijst);
  if (naar) await bijTaken((email) => verplaats(email, id, naar));
}

export async function zetGezienAction(
  id: number,
  gezien: boolean,
): Promise<void> {
  await bijTaken((email) => zetGezien(email, id, gezien));
}

export async function zetStatusAction(
  id: number,
  status: string,
): Promise<void> {
  const nieuw = parseStatus(status);
  if (nieuw) await bijTaken((email) => zetStatus(email, id, nieuw));
}

export async function zetVolgordeAction(
  status: string,
  ids: number[],
): Promise<void> {
  const kolom = parseStatus(status);
  if (kolom && ids.every(Number.isInteger))
    await bijTaken((email) => zetVolgorde(email, kolom, ids));
}

export async function zetPrioAction(id: number, prio: number): Promise<void> {
  const nieuw = parsePrio(prio);
  if (nieuw) await bijTaken((email) => zetPrio(email, id, nieuw));
}

export async function nieuweTaakAction(
  titel: string,
  status: string,
): Promise<void> {
  const kolom = parseStatus(status);
  const schoon = titel.trim().slice(0, MAX_TITEL);
  if (kolom && schoon)
    await bijTaken((email) => nieuweTaak(email, schoon, kolom));
}

const schoneTitel = (titel: string): string => titel.trim().slice(0, MAX_TITEL);

/** Zet een inbox-item op de to-do's, met de titel en prioriteit uit de popup. */
export async function naarTodoAction(
  id: number,
  titel: string,
  prio: number,
): Promise<void> {
  const schoon = schoneTitel(titel);
  const nieuw = parsePrio(prio);
  if (schoon && nieuw)
    await bijTaken((email) => naarTodo(email, id, schoon, nieuw));
}

/** Al afgehandeld vanuit de inbox: meteen een to-do in Klaar, met de titel en prio die er al zijn. */
export async function gedaanAction(id: number): Promise<void> {
  await bijTaken((email) => {
    const taak = leesTaak(email, id)?.taak;
    if (taak?.lijst !== "inbox") return;
    naarTodo(email, id, taak.titel, taak.prio);
    zetStatus(email, id, "klaar");
  });
}

export async function hernoemTaakAction(
  id: number,
  titel: string,
): Promise<void> {
  const schoon = schoneTitel(titel);
  if (schoon) await bijTaken((email) => hernoem(email, id, schoon));
}

/** Zet een melding uit Mijn feed op de to-do's en haalt hem uit de feed. */
export async function feedNaarTodoAction(
  melding: FeedTodo,
  titel: string,
  prio: number,
): Promise<void> {
  const schoon = schoneTitel(titel);
  const nieuw = parsePrio(prio);
  const compleet = [
    melding.id,
    melding.titel,
    melding.detail,
    melding.plek,
    melding.url,
  ].every((waarde) => typeof waarde === "string");
  if (!schoon || !nieuw || !compleet) return;
  await bijTaken((email) => {
    voegFeedToe(email, melding, schoon, nieuw);
    negeer(email, melding.id);
  });
}

export async function feedTodoOngedaanAction(id: string): Promise<void> {
  if (typeof id !== "string") return;
  await bijTaken((email) => {
    verwijderFeedTodo(email, id);
    herstel(email, id);
  });
}

/** Haalt nieuwe berichten op voor de teller in het menu; fouten komen op de Inbox-pagina. */
export async function synchroniseerInboxAction(): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const [platforms] = await Promise.all([
    notulenPlatforms(),
    bronAan(user.email, "slack") && synchroniseerSlack(user.email),
    bronAan(user.email, "gmail") && synchroniseerGmail(user.email),
  ]);
  // Notulen maken duurt minuten (Claude); de volgende ronde laat de stand zien.
  if (platforms) after(() => verwerkNotulen(user.email, platforms));
  revalidatePath("/", "layout");
}

/**
 * Sluit de afzender of het domein van een mailitem uit en zet het item op
 * genegeerd. Het adres komt uit de database, niet uit de browser.
 */
export async function sluitUitAction(id: number, soort: string): Promise<void> {
  if (soort !== "afzender" && soort !== "domein") return;
  await bijTaken((email) => {
    const adres = leesTaken(email, "inbox").find(
      (taak) => taak.id === id,
    )?.afzender;
    if (!adres) return;
    sluitUit(email, {
      waarde: soort === "afzender" ? adres : domeinVan(adres),
      soort,
    });
    verplaats(email, id, "genegeerd");
  });
}

/** Haalt een uitsluiting weg; `id` zet het item uit de toast terug in de Inbox. */
export async function staToeAction(waarde: string, id?: number): Promise<void> {
  if (typeof waarde !== "string") return;
  await bijTaken((email) => {
    staToe(email, waarde);
    if (typeof id === "number") verplaats(email, id, "inbox");
  });
}

/** Schakelaar op Instellingen. Gmail aanzetten zonder toegang vraagt die bij Google. */
export async function zetBronAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const bron = parseInboxBron(formData.get("bron"));
  if (!user || !bron) return;
  const aan = formData.get("aan") === "true";
  zetBron(user.email, bron, aan);
  revalidatePath("/", "layout");
  if (aan && bron === "gmail" && !isVerbonden(user.email, "gmail")) {
    redirect("/api/google/login");
  }
}

/** Uitsluiting weer toestaan vanaf Instellingen. */
export async function staToeFormAction(formData: FormData): Promise<void> {
  const waarde = formData.get("waarde");
  if (typeof waarde === "string") await staToeAction(waarde);
}

const MAX_INSTRUCTIE = 2000;

/**
 * Zet een to-do uit bij Claude: slaat de opdracht op en start de run op de
 * achtergrond. De status van de to-do blijft zoals hij is.
 */
export async function zetUitAction(
  taakId: number,
  instructie: string,
): Promise<void> {
  if (!Number.isInteger(taakId) || typeof instructie !== "string") return;
  await bijTaken((email) => {
    const bron = leesTaak(email, taakId)?.taak.bron;
    if (!bron) return;
    const id = maakOpdracht(
      email,
      taakId,
      instructie.trim().slice(0, MAX_INSTRUCTIE),
      soortVoorBron(bron),
    );
    if (id) after(() => draaiOpdracht(id));
  });
}

/** Opnieuw proberen na een mislukte run. */
export async function opnieuwUitzettenAction(
  opdrachtId: number,
): Promise<void> {
  if (!Number.isInteger(opdrachtId)) return;
  await bijTaken((email) => {
    if (herstart(email, opdrachtId)) after(() => draaiOpdracht(opdrachtId));
  });
}

/**
 * Akkoord op het voorstel: bij een Gmail-concept wordt het concept klaargezet in
 * Gmail (niet verstuurd). De to-do blijft ongemoeid.
 */
export async function akkoordAction(
  opdrachtId: number,
): Promise<AkkoordUitkomst> {
  const user = await currentUser();
  if (!user || !Number.isInteger(opdrachtId)) {
    return { uitkomst: "fout", fout: "Niet ingelogd" };
  }
  const uitkomst = await geefAkkoord(user.email, opdrachtId);
  revalidatePath("/", "layout");
  return uitkomst;
}

/** Afwijzen haalt het voorstel (of de mislukte opdracht) weg; `afwijzen = false` maakt dat voor een voorstel ongedaan. */
export async function wijsAfAction(
  opdrachtId: number,
  afwijzen: boolean,
): Promise<void> {
  if (!Number.isInteger(opdrachtId)) return;
  await bijTaken((email) => {
    if (!afwijzen)
      return zetBesluit(email, opdrachtId, "afgewezen", "voorstel");
    // Ook een mislukte opdracht kan weg, zodat je opnieuw kunt beginnen.
    zetBesluit(email, opdrachtId, "voorstel", "afgewezen");
    zetBesluit(email, opdrachtId, "mislukt", "afgewezen");
  });
}

/** Aanpassen: Claude maakt een nieuwe versie met de vorige versie en de feedback als input. */
export async function pasAanAction(
  opdrachtId: number,
  feedback: string,
): Promise<void> {
  const schoon = typeof feedback === "string" ? feedback.trim() : "";
  if (!Number.isInteger(opdrachtId) || !schoon) return;
  await bijTaken((email) => {
    if (startAanpassing(email, opdrachtId, schoon.slice(0, MAX_INSTRUCTIE))) {
      after(() => draaiOpdracht(opdrachtId));
    }
  });
}

// ---------- Meetings ----------

/** Wat de client van een meeting meestuurt; gecontroleerd voor het de database in gaat. */
export type MeetingRef = {
  id: string;
  serieId: string | null;
  titel: string;
  start: string;
};

const DOEL = /^[a-z0-9-]{1,100}$/;
const kortTekst = (waarde: unknown, max: number): waarde is string =>
  typeof waarde === "string" && waarde !== "" && waarde.length <= max;

function geldigeMeeting(meeting: MeetingRef): boolean {
  return (
    kortTekst(meeting.id, 1024) &&
    (meeting.serieId === null || kortTekst(meeting.serieId, 1024)) &&
    kortTekst(meeting.titel, 500) &&
    !Number.isNaN(Date.parse(meeting.start))
  );
}

async function bijMeetings(doe: (email: string) => void): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  doe(user.email);
  // De layout ook: een overgeslagen vastgelopen meeting telt niet meer mee in de Inbox.
  revalidatePath("/", "layout");
}

/**
 * Voegt het titelwoord toe aan de roepnamen van een platform, in Superhuman en
 * meteen in de cache. Een fout komt terug als tekst; bij succes null.
 */
async function bewaarRoepnaam(
  meeting: MeetingRef,
  slug: string,
): Promise<string | null> {
  const woord = titelWoord(meeting.titel);
  if (!woord) return "Deze titel heeft geen woord om te onthouden.";
  if (woord.includes(",")) {
    return `"${woord}" bevat een komma en kan geen roepnaam zijn.`;
  }
  // Vers uit Superhuman: opslaan schrijft de hele rij terug, dus een oude cache zou wijzigingen wissen.
  clearAccountGegevensCache();
  const dashboard = await loadDashboard();
  if (dashboard.status !== "ok") return "Orbit is niet bereikbaar.";
  // Zonder actuele gegevens zou opslaan wat er in Superhuman staat overschrijven.
  if (dashboard.gegevensFout) {
    return `De accountgegevens konden niet uit Superhuman worden opgehaald. ${dashboard.gegevensFout}`;
  }
  const platform = dashboard.platforms.find((item) => item.slug === slug);
  const orbitId = platform?.klant.orbitId;
  if (!platform || !orbitId) return "Dit platform is niet in Orbit gevonden.";

  const conflict = roepnaamConflict(
    [woord],
    dashboard.platforms
      .filter((item) => item.slug !== slug)
      .map((item) => ({ naam: item.naam, roepnamen: item.gegevens.roepnamen })),
  );
  if (conflict) return conflict;

  const roepnamen = normaliseerRoepnamen([
    ...platform.gegevens.roepnamen,
    woord,
  ]);
  try {
    await savePlatformGegevens(
      orbitId,
      platform.klant.orbitNaam,
      platform.klant.velden,
      { ...platform.gegevens, naam: platform.naam, roepnamen },
      platform.gegevens.naam,
    );
  } catch (error) {
    return `Opslaan in Superhuman is mislukt. ${error instanceof Error ? error.message : String(error)}`;
  }
  return null;
}

/**
 * De pil: waar deze meeting, de rest van de serie of elke meeting met dit titelwoord bij hoort.
 * Een fout komt terug als tekst; bij succes null.
 */
export async function koppelMeetingAction(
  meeting: MeetingRef,
  doel: string,
  scope: string,
): Promise<string | null> {
  if (!geldigeMeeting(meeting) || typeof doel !== "string" || !DOEL.test(doel))
    return null;
  if (scope !== "deze" && scope !== "serie" && scope !== "titel") return null;
  if (!(await currentUser())) return null;
  const alsRoepnaam = scope === "titel" && doel !== TEAM && doel !== PRIVE;
  if (alsRoepnaam) {
    const fout = await bewaarRoepnaam(meeting, doel);
    if (fout) return fout;
  }
  await bijMeetings((email) => {
    // De nieuwe keuze moet ook voor deze meeting gelden, dus een oude keuze voor alleen deze vervalt.
    verwijderMeetingRegel(email, meeting.id);
    if (scope === "serie" && meeting.serieId) {
      bewaarRegel(email, {
        soort: "serie",
        sleutel: meeting.serieId,
        doel,
        titel: meeting.titel,
        vanaf: Date.parse(meeting.start),
      });
      return;
    }
    // Bij een roepnaam herkent Meetings de meeting daaraan; een regel is dan niet nodig.
    if (alsRoepnaam) return;
    bewaarRegel(email, {
      soort: "meeting",
      sleutel: meeting.id,
      doel,
      titel: meeting.titel,
      vanaf: null,
    });
  });
  return null;
}

/** "Geen notulen": alleen deze meeting of de hele serie. */
export async function slaMeetingOverAction(
  meeting: MeetingRef,
  serie: boolean,
): Promise<void> {
  if (!geldigeMeeting(meeting)) return;
  await bijMeetings((email) =>
    slaOver(
      email,
      serie && meeting.serieId
        ? { soort: "serie", sleutel: meeting.serieId, titel: meeting.titel }
        : { soort: "meeting", sleutel: meeting.id, titel: meeting.titel },
    ),
  );
}

/** Terugzetten in het paneel: de meeting en, als hij daardoor overgeslagen is, zijn serie. */
export async function zetMeetingTerugAction(
  meeting: MeetingRef,
): Promise<void> {
  if (!geldigeMeeting(meeting)) return;
  await bijMeetings((email) => {
    zetTerug(email, "meeting", meeting.id);
    if (meeting.serieId) zetTerug(email, "serie", meeting.serieId);
  });
}

/** Terugzetten van een overgeslagen serie op Instellingen. */
export async function zetSerieTerugFormAction(
  formData: FormData,
): Promise<void> {
  const serieId = formData.get("serie");
  if (!kortTekst(serieId, 1024)) return;
  await bijMeetings((email) => zetTerug(email, "serie", serieId));
}

/** Het Slack-kanaal van een Team-serie, op Instellingen. */
export async function zetKanaalFormAction(formData: FormData): Promise<void> {
  const serieId = formData.get("serie");
  const kanaal = formData.get("kanaal");
  if (!kortTekst(serieId, 1024) || typeof kanaal !== "string") return;
  await bijMeetings((email) =>
    zetKanaal(email, serieId, kanaal.trim().slice(0, 100)),
  );
}

/** Opnieuw proberen na een mislukte stap: wat al gedaan is, blijft staan. Geeft een melding als notulen maken hier uitstaat. */
export async function opnieuwNotulenAction(
  meetingId: string,
): Promise<string | null> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string") return null;
  if (!notulenAan()) return NOTULEN_UIT;
  if (!herstelNotulen(user.email, meetingId)) return null;
  const platforms = await notulenPlatforms();
  if (platforms) after(() => verwerkNotulen(user.email, platforms));
  revalidatePath("/", "layout");
  return null;
}

/** De gekoppelde Plaud-opname en de opnames rond de dag van de meeting. */
export async function opnameKeuzesAction(
  meetingId: string,
): Promise<OpnameKeuzes> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string") return { fout: "Niet ingelogd" };
  return opnameKeuzes(user.email, meetingId);
}

/** Een andere opname koppelen, of null voor Geen opname; de notulen worden opnieuw gemaakt. */
export async function kiesOpnameAction(
  meetingId: string,
  opnameId: string | null,
): Promise<string | null> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string") return null;
  if (opnameId !== null && !/^of_[0-9a-f]{32}$/.test(opnameId)) return null;
  if (!notulenAan()) return NOTULEN_UIT;
  if (!zetOpname(user.email, meetingId, opnameId)) return null;
  const platforms = await notulenPlatforms();
  if (platforms) after(() => verwerkNotulen(user.email, platforms));
  revalidatePath("/", "layout");
  return null;
}

/** Verversen voor één meeting: opnieuw naar Plaud kijken, zonder de rest van de pagina. */
export async function verversMeetingAction(
  meetingId: string,
): Promise<string | null> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string") return null;
  if (!notulenAan()) return NOTULEN_UIT;
  const platforms = await notulenPlatforms();
  if (!platforms) return null;
  const vervolg = await ververs(user.email, meetingId, platforms);
  if (typeof vervolg === "function") after(vervolg);
  revalidatePath("/", "layout");
  return null;
}

/**
 * Niet delen (`soort` "niet"), Al gedeeld ("elders") of ongedaan maken ("terug"):
 * er wordt niets verstuurd.
 */
export async function nietDelenAction(
  meetingId: string,
  soort: string,
): Promise<void> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string") return;
  if (soort !== "niet" && soort !== "elders" && soort !== "terug") return;
  const wijzig = {
    niet: nietDelen,
    elders: eldersGedeeld,
    terug: tochDelen,
  }[soort];
  if (wijzig(user.email, meetingId)) revalidatePath("/", "layout");
}

const ONDERDEEL_KEUZES = {
  overslaan: slaOnderdeelOver,
  toch: heropenOnderdeel,
  verstuurd: bevestigVerstuurd,
};

/** Slaat de mail of het Slack-bericht over, zet het weer open (Toch versturen), of bevestigt na een onzekere verzending dat het er staat. */
export async function zetDeelOnderdeelAction(
  meetingId: string,
  onderdeel: string,
  keuze: string,
): Promise<void> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string" || !isDeelOnderdeel(onderdeel))
    return;
  if (keuze !== "overslaan" && keuze !== "toch" && keuze !== "verstuurd")
    return;
  if (ONDERDEEL_KEUZES[keuze](user.email, meetingId, onderdeel))
    revalidatePath("/", "layout");
}

/** Uitkomst van delen: gelukt, opnieuw verbinden (Google of Slack), of een fout. */
export type DeelUitkomst =
  | { uitkomst: "gelukt"; conceptUrl: string | null }
  | { uitkomst: "verbinden" }
  | { uitkomst: "fout"; fout: string };

const reden = (fout: unknown) =>
  fout instanceof Error ? fout.message : String(fout);

/** Verstuurt de mail met de notulen aan de klant, direct via Gmail, na een klik op Verstuur mail. */
export async function stuurDeelMailAction(
  meetingId: string,
  mail: { aan: string[]; onderwerp: string; tekst: string },
): Promise<DeelUitkomst> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string")
    return { uitkomst: "fout", fout: "Niet ingelogd" };
  const { aan, onderwerp, tekst } = mail ?? {};
  if (
    !Array.isArray(aan) ||
    aan.length === 0 ||
    aan.length > 50 ||
    !aan.every((adres) => typeof adres === "string" && isEmail(adres))
  ) {
    return { uitkomst: "fout", fout: "Kies minstens één geldig e-mailadres" };
  }
  if (
    typeof onderwerp !== "string" ||
    !onderwerp.trim() ||
    onderwerp.length > 300 ||
    typeof tekst !== "string" ||
    !tekst.trim() ||
    tekst.length > 10000
  ) {
    return {
      uitkomst: "fout",
      fout: "Het onderwerp of bericht is leeg of te lang",
    };
  }
  try {
    const fout = await stuurDeelMail(user.email, meetingId, {
      aan: aan.map((adres) => adres.trim()),
      onderwerp: onderwerp.trim(),
      tekst: tekst.trim(),
    });
    revalidatePath("/", "layout");
    if (fout) return { uitkomst: "fout", fout: fout.fout };
    return { uitkomst: "gelukt", conceptUrl: null };
  } catch (fout) {
    if (
      fout instanceof GmailComposeOntbreektError ||
      fout instanceof GmailNietVerbondenError
    )
      return { uitkomst: "verbinden" };
    return { uitkomst: "fout", fout: `Versturen mislukte: ${reden(fout)}` };
  }
}

/** Plaatst het Slack-bericht over de notulen, na een klik op Verstuur. */
export async function deelInSlackAction(
  meetingId: string,
  bericht: string,
): Promise<DeelUitkomst> {
  const user = await currentUser();
  if (!user || typeof meetingId !== "string")
    return { uitkomst: "fout", fout: "Niet ingelogd" };
  if (typeof bericht !== "string" || !bericht.trim() || bericht.length > 4000)
    return { uitkomst: "fout", fout: "Het bericht is leeg of te lang" };
  const platforms = await notulenPlatforms();
  if (!platforms)
    return { uitkomst: "fout", fout: "De platforms zijn niet te lezen" };
  try {
    const fout = await deelInSlack(
      user.email,
      meetingId,
      bericht.trim(),
      platforms,
    );
    if (fout) return { uitkomst: "fout", fout: fout.fout };
    revalidatePath("/", "layout");
    return { uitkomst: "gelukt", conceptUrl: null };
  } catch (fout) {
    if (
      fout instanceof SlackSchrijvenOntbreektError ||
      fout instanceof SlackNietVerbondenError
    )
      return { uitkomst: "verbinden" };
    return { uitkomst: "fout", fout: `Versturen mislukte: ${reden(fout)}` };
  }
}

// ---------- Actiepunten ----------

const geldigId = (id: unknown): id is number =>
  typeof id === "number" && Number.isInteger(id) && id > 0;

/** Gedaan, Negeer, of terug in de feed (ongedaan maken). */
export async function actieStatusAction(
  id: number,
  status: string,
): Promise<void> {
  if (!geldigId(id)) return;
  if (status !== "gedaan" && status !== "genegeerd" && status !== "terug")
    return;
  await bijTaken((email) => zetActieStatus(email, id, status));
}

/** Een eigen actie op de to-do's, met de titel en prioriteit uit de popup. */
export async function actieNaarTodoAction(
  id: number,
  titel: string,
  prio: number,
): Promise<void> {
  const user = await currentUser();
  const schoon = schoneTitel(String(titel));
  const nieuw = parsePrio(prio);
  if (!user || !geldigId(id) || !schoon || !nieuw) return;
  actieNaarTodo(user.email, user.voornaam, id, schoon, nieuw);
  revalidatePath("/", "layout");
}

export type HerinnerUitkomst = HerinnerVoorstel | { soort: "verbinden" };

/** Het herinnerbericht van Claude; vraagt eerst om de persoon als de naam niet eenduidig is. */
export async function herinnerVoorstelAction(
  id: number,
  gekozen: string | null,
): Promise<HerinnerUitkomst> {
  const user = await currentUser();
  if (!user || !geldigId(id)) return { soort: "fout", fout: "Niet ingelogd" };
  if (gekozen !== null && (typeof gekozen !== "string" || gekozen.length > 50))
    return { soort: "fout", fout: "Ongeldige keuze" };
  try {
    if (!(await slackMagDm(user.email))) return { soort: "verbinden" };
    return await herinnerVoorstel(user.email, user.voornaam, id, gekozen);
  } catch (fout) {
    if (fout instanceof SlackNietVerbondenError) return { soort: "verbinden" };
    return {
      soort: "fout",
      fout: `Het bericht maken mislukte: ${reden(fout)}`,
    };
  }
}

/** Stuurt de herinnering als Slack-DM, na een klik op Verstuur. */
export async function herinnerAction(
  id: number,
  bericht: string,
): Promise<DeelUitkomst> {
  const user = await currentUser();
  if (!user || !geldigId(id))
    return { uitkomst: "fout", fout: "Niet ingelogd" };
  if (typeof bericht !== "string" || !bericht.trim() || bericht.length > 4000)
    return { uitkomst: "fout", fout: "Het bericht is leeg of te lang" };
  try {
    const fout = await herinner(user.email, user.voornaam, id, bericht.trim());
    if (fout) return { uitkomst: "fout", fout: fout.fout };
    revalidatePath("/", "layout");
    return { uitkomst: "gelukt", conceptUrl: null };
  } catch (fout) {
    if (
      fout instanceof SlackSchrijvenOntbreektError ||
      fout instanceof SlackNietVerbondenError
    )
      return { uitkomst: "verbinden" };
    return { uitkomst: "fout", fout: `Versturen mislukte: ${reden(fout)}` };
  }
}
