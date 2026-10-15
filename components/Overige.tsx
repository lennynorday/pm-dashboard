import type { Signaal } from "@/lib/budgetsignaal";
import { BUDGET_MELDING } from "@/lib/budgetsignaal";
import type { Platform, Project } from "@/lib/dashboard";
import { formatUren } from "@/lib/format";
import { plafond, type ProjectBudgetResult } from "@/lib/orbit/budget";
import { somRegels } from "@/lib/sprint";
import { Budgetregel } from "./Budgetregel";
import { OrbitLink } from "./OrbitLink";
import styles from "./Sectie.module.css";
import { Uitklapper } from "./Uitklapper";

export type OverigRij = {
  platform: Platform;
  project: Project;
  budget: ProjectBudgetResult;
};

/** Geen sprint om in te plannen, dus alleen wat er nog over is. */
function noot(budget: number, geschreven: number, gepland: number): Signaal {
  const over = budget - geschreven - gepland;
  if (over < 0) {
    return {
      soort: "rustig",
      icoon: "alert",
      tekst: `${formatUren(-over)}u over budget`,
    };
  }
  return {
    soort: "rustig",
    icoon: "clock",
    tekst: `${formatUren(over)}u over`,
  };
}

function Overig({ rij: { platform, project, budget } }: { rij: OverigRij }) {
  const onder = <span className={styles.meta}>{platform.klant.naam}</span>;

  if (budget.status !== "ok") {
    return (
      <Uitklapper
        titel={project.naam}
        onder={onder}
        rechts={
          <span className={styles.melding}>
            {BUDGET_MELDING[budget.status]}
          </span>
        }
      />
    );
  }

  const { data } = budget;
  const gepland = somRegels(
    data.mappen.flatMap((map) => map.regels),
    "gepland",
  );
  const maxMinuten = plafond(data).minuten;
  const mappen = data.mappen
    .map((map) => ({
      map,
      beschikbaar: somRegels(map.regels, "beschikbaar"),
      geschreven: somRegels(map.regels, "geschreven"),
      gepland: somRegels(map.regels, "gepland"),
    }))
    .filter(({ beschikbaar, geschreven }) => beschikbaar > 0 || geschreven > 0);
  return (
    <Uitklapper
      titel={project.naam}
      onder={onder}
      rechts={
        <Budgetregel
          budget={maxMinuten}
          geschreven={data.geschreven}
          gepland={gepland}
          noot={noot(maxMinuten, data.geschreven, gepland)}
        />
      }
    >
      <div className={styles.uitklap}>
        <ul className={styles.regels}>
          {mappen.map(
            ({ map, beschikbaar, geschreven, gepland: mapGepland }) => (
              <li key={map.id || map.naam} className={styles.sub}>
                <span className={styles.regelNaam}>{map.naam}</span>
                <Budgetregel
                  budget={beschikbaar}
                  geschreven={geschreven}
                  gepland={mapGepland}
                  noot={noot(beschikbaar, geschreven, mapGepland)}
                />
              </li>
            ),
          )}
        </ul>
        <div className={styles.voet}>
          <OrbitLink project={project} />
        </div>
      </div>
    </Uitklapper>
  );
}

/** Projecten zonder SLA en zonder sprint: het hele project tegen het budget. */
export function Overige({ rijen }: { rijen: OverigRij[] }) {
  if (rijen.length === 0) return null;
  return (
    <section className={styles.kaart} aria-labelledby="overig-kop">
      <div className={styles.kaartKop}>
        <h2 id="overig-kop" className={styles.kaartTitel}>
          Overige projecten
        </h2>
        <span className={styles.kopUitleg}>Uren tegen het budget</span>
      </div>
      <ul className={styles.rijen}>
        {rijen.map((rij) => (
          <li key={rij.project.number}>
            <Overig rij={rij} />
          </li>
        ))}
      </ul>
    </section>
  );
}
