"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormState, readFormWaarden, validateForm } from "@/lib/account-form";
import {
  clearAccountGegevensCache,
  saveAccountGegevens,
} from "@/lib/accountgegevens";
import { loadDashboard } from "@/lib/dashboard";
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

/** Slaat de gegevens van één account op; bij fouten blijft alles staan wat is ingevuld. */
export async function saveAccountAction(
  slug: string,
  _vorige: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await currentUser()) || !/^[a-z0-9-]+$/.test(slug)) redirect("/");
  const waarden = readFormWaarden(formData);
  const uitkomst = validateForm(waarden);
  if ("fouten" in uitkomst) return { fouten: uitkomst.fouten, waarden };

  const dashboard = await loadDashboard();
  const account =
    dashboard.status === "ok"
      ? dashboard.accounts.find((item) => item.slug === slug)
      : undefined;
  if (!account?.orbitId) {
    return {
      fouten: {
        opslaan:
          "Dit account is niet in Orbit gevonden, dus het kan niet worden opgeslagen.",
      },
      waarden,
    };
  }
  try {
    await saveAccountGegevens(
      account.orbitId,
      account.orbitNaam,
      uitkomst.gegevens,
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
  redirect(`/accounts/${slug}`);
}
