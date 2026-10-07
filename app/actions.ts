"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
import { herstelAlles, negeer } from "@/lib/genegeerde-meldingen";
import { hideProject, showProject } from "@/lib/hidden-projects";
import { clearJiraCache } from "@/lib/jira/overview";
import { BRONNEN, deleteKoppeling } from "@/lib/koppelingen";
import { clearBudgetCache } from "@/lib/orbit/budget";
import { clearProjectCache } from "@/lib/orbit/projects";
import { currentUser, SESSIE_COOKIE, stopSessie } from "@/lib/session";

export async function refreshData(): Promise<void> {
  clearProjectCache();
  clearBudgetCache();
  clearJiraCache();
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

export async function negeerMeldingAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const id = formData.get("id");
  if (!user || typeof id !== "string") return;
  negeer(user.email, id);
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

  try {
    await savePlatformGegevens(
      orbitId,
      platform.klant.orbitNaam,
      {
        ...uitkomst.klant,
        zonderPlatform: platform.klant.velden.zonderPlatform,
      },
      nieuw
        ? { ...uitkomst.platform, orbitProjecten: [] }
        : {
            ...uitkomst.platform,
            rijId: platform.gegevens.rijId,
            orbitProjecten: platform.gegevens.orbitProjecten,
          },
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
        orbitProjecten: keuzes
          .filter(
            (item) =>
              typeof item.keuze === "object" &&
              item.keuze?.platform === zuster.naam,
          )
          .map((item) => item.number),
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
