"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hideProject, showProject } from "@/lib/hidden-projects";
import { clearJiraCache } from "@/lib/jira/overview";
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
