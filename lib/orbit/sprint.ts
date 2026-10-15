import type { Platform, Project } from "@/lib/dashboard";
import { bewaar, lees, vers } from "@/lib/db";
import {
  bepaalMensen,
  bepaalSprint,
  dagPlus,
  isoDatum,
  maandagVan,
  parseBij,
  parsePlanning,
  parseTijd,
  venster,
  type Mensen,
  type Sprint,
  type Tijdregel,
} from "@/lib/sprint";
import { opAchtergrond } from "./achtergrond";
import type { ProjectBudgetResult } from "./budget";
import { callOrbitTool } from "./client";

export type Cachet<T> =
  { status: "ok"; data: T } | { status: "laden" } | { status: "fout" };

const CACHE_MS = 15 * 60 * 1000;
// Na een mislukte poging even niet opnieuw, zoals bij het budget.
const FOUT_MS = 5 * 60 * 1000;
const fouten = new Map<string, number>();

/**
 * Eén Orbit-aanroep, 15 minuten per gebruiker gecachet en op de achtergrond opgehaald
 * (zelfde patroon als fetchProjectBudget). Tot dan de bewaarde gegevens, of "laden".
 */
function viaCache<T>(
  email: string,
  sleutel: string,
  tool: string,
  args: Record<string, unknown>,
  parse: (tekst: string) => T,
): Cachet<T> {
  const hit = lees<T>(sleutel);
  if (hit && vers(hit.opgehaald, CACHE_MS)) {
    return { status: "ok", data: hit.waarde };
  }
  const mislukt = fouten.get(sleutel);
  if (mislukt && vers(mislukt, FOUT_MS)) {
    return hit ? { status: "ok", data: hit.waarde } : { status: "fout" };
  }
  opAchtergrond(sleutel, async () => {
    const result = await callOrbitTool(email, tool, args, true);
    if (result.status !== "ok") {
      fouten.set(sleutel, Date.now());
      return;
    }
    fouten.delete(sleutel);
    bewaar(sleutel, parse(result.text));
  });
  return hit ? { status: "ok", data: hit.waarde } : { status: "laden" };
}

// ponytail: Orbit geeft maximaal 100 regels per aanroep; een project met meer planning in drie weken wordt afgekapt.
const planning = (email: string, number: string, van: string, tot: string) =>
  viaCache(
    email,
    `planning:v1:${email}:${number}:${van}`,
    "ListPlannedEntries",
    { projectId: number, user: "*", dateFrom: van, dateTo: tot },
    parsePlanning,
  );

const uren = (email: string, number: string, van: string, tot: string) =>
  viaCache(
    email,
    `uren:v1:${email}:${number}:${van}:${tot}`,
    "ListTimeEntries",
    {
      projectId: number,
      user: "*",
      kind: "logged",
      dateFrom: van,
      dateTo: tot,
    },
    parseTijd,
  );

const timesheet = (email: string, van: string) =>
  viaCache(
    email,
    `timesheet:v1:${email}:${van}`,
    "GetTimesheetStatus",
    { dateFrom: van, days: 14 },
    (tekst) => parseBij(tekst, van),
  );

export type SprintBron = {
  platform: Platform;
  project: Project;
  budget: ProjectBudgetResult;
};

export type SprintRij = SprintBron & {
  /** Null zolang het budget ontbreekt of de planning op geen enkele map past. */
  sprint: Sprint | null;
  mensen: Cachet<Mensen>;
};

export type SprintLading = {
  rijen: SprintRij[];
  /** Projecten waarvan de planning nog binnenkomt of mislukte: die blijven voorlopig bij de platformkaarten. */
  laden: number;
  fout: number;
};

function mensenVan(
  email: string,
  bron: SprintBron,
  sprint: Sprint,
  vandaag: string,
): Cachet<Mensen> {
  const tijd: Cachet<Tijdregel[]> =
    sprint.start > vandaag
      ? { status: "ok", data: [] }
      : uren(email, bron.project.number, sprint.start, vandaag);
  // De timesheetstatus loopt vanaf maandag vorige week, net als het planningsvenster.
  const bij = timesheet(email, dagPlus(maandagVan(vandaag), -7));
  if (tijd.status === "fout" || bij.status === "fout") {
    return { status: "fout" };
  }
  if (tijd.status === "laden" || bij.status === "laden") {
    return { status: "laden" };
  }
  return {
    status: "ok",
    data: bepaalMensen(sprint, tijd.data, bij.data, vandaag),
  };
}

/**
 * Per niet-SLA project de planning van vorige t/m volgende week; wie daarin iemand
 * heeft staan, is een sprintproject. Alleen daarvoor komen uren en timesheets erbij.
 * Kosten per 15 minuten: N planningen + S urenlijsten + 1 timesheet-aanroep.
 */
export function laadSprints(
  email: string,
  bronnen: SprintBron[],
  vandaagDatum: Date,
): SprintLading {
  const vandaag = isoDatum(vandaagDatum);
  const { van, tot } = venster(vandaag);
  const lading: SprintLading = { rijen: [], laden: 0, fout: 0 };
  for (const bron of bronnen) {
    const plan = planning(email, bron.project.number, van, tot);
    if (plan.status === "laden") lading.laden++;
    if (plan.status === "fout") lading.fout++;
    if (plan.status !== "ok" || plan.data.length === 0) continue;
    const sprint =
      bron.budget.status === "ok"
        ? bepaalSprint(bron.budget.data.mappen, plan.data, vandaag)
        : null;
    lading.rijen.push({
      ...bron,
      sprint,
      mensen: sprint
        ? mensenVan(email, bron, sprint, vandaag)
        : { status: "laden" },
    });
  }
  return lading;
}
