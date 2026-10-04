"use server";

import { revalidatePath } from "next/cache";
import { hideProject, showProject } from "@/lib/hidden-projects";
import { clearJiraCache } from "@/lib/jira/overview";
import { clearProjectCache } from "@/lib/orbit/projects";

export async function refreshData(): Promise<void> {
  clearProjectCache();
  clearJiraCache();
  revalidatePath("/", "layout");
}

export async function hideProjectAction(formData: FormData): Promise<void> {
  const number = formData.get("projectnummer");
  if (typeof number !== "string") return;
  await hideProject(number);
  revalidatePath("/", "layout");
}

export async function showProjectAction(formData: FormData): Promise<void> {
  const number = formData.get("projectnummer");
  if (typeof number !== "string") return;
  await showProject(number);
  revalidatePath("/", "layout");
}
