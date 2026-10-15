import type { Platform, Project } from "@/lib/dashboard";
import { bewaar, lees, vers } from "@/lib/db";
import {
  bepaalMensen,
  bepaalSprint,
  dagPlus,
  ingeplandVanaf,
  isoDatum,
  maandagVan,
  parseBij,
  parsePlanning,
  parseTijd,
  venster,
  type Bereik,
  type Mensen,
  type Planregel,
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

/** Eén aanroep voor Sprints (vorige t/m volgende week) én Overige projecten (vooruitkijken). */
const PLANNING_DAGEN = 90;

// ponytail: Orbit geeft maximaal 100 regels per aanroep; een project met meer planning in dit venster wordt afgekapt (de latere dagen vallen af).
const planning = (email: string, number: string, vandaag: string) => {
  const van = venster(vandaag).van;
  return viaCache(
    email,
    `planning:v2:${email}:${number}:${van}`,
    "ListPlannedEntries",
    {
      projectId: number,
      user: "*",
      dateFrom: van,
      dateTo: dagPlus(vandaag, PLANNING_DAGEN),
    },
    parsePlanning,
  );
};

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
  /** Projecten waarvan de planning nog binnenkomt of mislukte: die staan onder Overige projecten. */
  laden: number;
  fout: number;
};

function mensenVan(
  email: string,
  bron: SprintBron,
  bereik: Bereik,
  vandaag: string,
): Cachet<Mensen> {
  const tijd: Cachet<Tijdregel[]> =
    bereik.start > vandaag
      ? { status: "ok", data: [] }
      : uren(email, bron.project.number, bereik.start, vandaag);
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
    data: bepaalMensen(bereik, tijd.data, bij.data, vandaag),
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
  const { tot } = venster(vandaag);
  const lading: SprintLading = { rijen: [], laden: 0, fout: 0 };
  for (const bron of bronnen) {
    const plan = planning(email, bron.project.number, vandaag);
    if (plan.status === "laden") lading.laden++;
    if (plan.status === "fout") lading.fout++;
    if (plan.status !== "ok") continue;
    // Verder vooruit kijken is voor Overige projecten; een sprint zoekt alleen binnen het venster.
    const binnenVenster = plan.data.filter(({ datum }) => datum <= tot);
    if (binnenVenster.length === 0) continue;
    const sprint =
      bron.budget.status === "ok"
        ? bepaalSprint(bron.budget.data.mappen, binnenVenster, vandaag)
        : null;
    lading.rijen.push({
      ...bron,
      sprint,
      mensen: sprint
        ? mensenVan(
            email,
            bron,
            {
              regels: sprint.map.regels,
              start: sprint.start,
              planning: sprint.planning,
            },
            vandaag,
          )
        : { status: "laden" },
    });
  }
  return lading;
}

export type OverigRij = SprintBron & {
  /** Eerste geplande dag na vandaag; null als er niets ingepland staat. */
  vanaf: Cachet<string | null>;
  mensen: Cachet<Mensen>;
};

/** Uren van de laatste vier weken: vandaag en de 27 dagen ervoor. */
const OVERIG_DAGEN = 27;

/**
 * Per overig project dezelfde signalen als een sprint, maar over alle taken.
 * Mensen op een taak: wie erop schreef in de laatste vier weken of erop gepland staat;
 * ponytail: matcht op taaknaam, dus dezelfde naam in meer mappen toont dezelfde mensen.
 * Kosten per 15 minuten: de planning van laadSprints, 1 urenlijst per project en de gedeelde timesheet-aanroep.
 * ponytail: Orbit geeft maximaal 100 regels per aanroep; een drukker project telt te weinig uren.
 */
export function laadOverige(
  email: string,
  bronnen: SprintBron[],
  vandaagDatum: Date,
): OverigRij[] {
  const vandaag = isoDatum(vandaagDatum);
  const laden = { status: "laden" } as const;
  return bronnen.map((bron): OverigRij => {
    if (bron.budget.status !== "ok") {
      return { ...bron, vanaf: laden, mensen: laden };
    }
    const plan = planning(email, bron.project.number, vandaag);
    if (plan.status !== "ok") return { ...bron, vanaf: plan, mensen: plan };
    const komend: Planregel[] = plan.data.filter(
      ({ datum }) => datum >= vandaag,
    );
    return {
      ...bron,
      vanaf: { status: "ok", data: ingeplandVanaf(komend, vandaag) },
      mensen: mensenVan(
        email,
        bron,
        {
          regels: bron.budget.data.mappen.flatMap((map) => map.regels),
          start: dagPlus(vandaag, -OVERIG_DAGEN),
          planning: komend,
        },
        vandaag,
      ),
    };
  });
}
