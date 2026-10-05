"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormState, readFormWaarden, validateForm } from "@/lib/account-form";
import { parseExport, saveAccountGegevens } from "@/lib/accountgegevens";
import { hideProject, showProject } from "@/lib/hidden-projects";
import { clearJiraCache } from "@/lib/jira/overview";
import { BRONNEN, deleteKoppeling } from "@/lib/koppelingen";
import { clearProjectCache } from "@/lib/orbit/projects";
import { currentUser, SESSIE_COOKIE, stopSessie } from "@/lib/session";

export async function refreshData(): Promise<void> {
  clearProjectCache();
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
  clearJiraCache();
  revalidatePath("/", "layout");
}

/** Leest een exportbestand in; het resultaat staat daarna op de pagina Instellingen. */
export async function importAccountGegevensAction(
  formData: FormData,
): Promise<void> {
  if (!(await currentUser())) return;
  const bestand = formData.get("bestand");
  let uitkomst: Record<string, string>;
  try {
    if (!(bestand instanceof File) || bestand.size === 0) {
      throw new Error("Kies eerst een bestand");
    }
    const accounts = parseExport(JSON.parse(await bestand.text()));
    saveAccountGegevens(accounts);
    uitkomst = { import: "ok", aantal: String(Object.keys(accounts).length) };
  } catch (error) {
    const melding =
      error instanceof SyntaxError
        ? "Het bestand is geen geldige JSON"
        : error instanceof Error
          ? error.message
          : String(error);
    uitkomst = { import: "fout", melding };
  }
  revalidatePath("/", "layout");
  redirect(`/instellingen?${new URLSearchParams(uitkomst)}#accountgegevens`);
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

  saveAccountGegevens({ [slug]: uitkomst.gegevens });
  revalidatePath("/", "layout");
  redirect(`/accounts/${slug}`);
}
