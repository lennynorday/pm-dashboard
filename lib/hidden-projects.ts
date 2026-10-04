import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "verborgen-projecten.json");

/** Projectnummers die ik heb verborgen. */
export async function readHiddenProjects(): Promise<string[]> {
  try {
    const data: unknown = JSON.parse(await readFile(FILE, "utf8"));
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

async function write(numbers: string[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(numbers, null, 2));
}

export async function hideProject(number: string): Promise<void> {
  const hidden = await readHiddenProjects();
  if (hidden.includes(number)) return;
  await write([...hidden, number]);
}

export async function showProject(number: string): Promise<void> {
  const hidden = await readHiddenProjects();
  await write(hidden.filter((item) => item !== number));
}
