import { Fragment } from "react";
import { BUDGET_MELDING, regelStatus } from "@/lib/budgetsignaal";
import type { OverigRij } from "@/lib/orbit/sprint";
import { dagLabel, somRegels } from "@/lib/sprint";
import { Budgetregel } from "./Budgetregel";
import { OrbitLink } from "./OrbitLink";
import styles from "./Sectie.module.css";
import eigen from "./Sprints.module.css";
import { Regel, UrenStand } from "./Sprints";
import { Uitklapper } from "./Uitklapper";

function Overig({
  rij: { platform, project, budget, vanaf, mensen },
}: {
  rij: OverigRij;
}) {
  if (budget.status !== "ok") {
    return (
      <Uitklapper
        titel={project.naam}
        onder={<span className={styles.meta}>{platform.klant.naam}</span>}
        rechts={
          <span className={styles.melding}>
            {BUDGET_MELDING[budget.status]}
          </span>
        }
      />
    );
  }
  const alle = budget.data.mappen.flatMap((map) => map.regels);
  const budgetSom = somRegels(alle, "beschikbaar");
  const geschreven = somRegels(alle, "geschreven");
  const gepland = somRegels(alle, "gepland");
  const mappen = budget.data.mappen
    .map((map) => ({
      map,
      regels: map.regels.filter(
        (regel) => regel.beschikbaar > 0 || regel.geschreven > 0,
      ),
    }))
    .filter(({ regels }) => regels.length > 0);
  const laatst = mensen.status === "ok" ? mensen.data.laatst : null;
  const ingepland =
    vanaf.status !== "ok"
      ? undefined
      : vanaf.data
        ? `Ingepland vanaf ${dagLabel(vanaf.data)}`
        : "Niets ingepland";
  return (
    <Uitklapper
      titel={project.naam}
      onder={
        <>
          <span className={styles.meta}>
            {platform.klant.naam}
            {laatst && ` · laatst geschreven ${dagLabel(laatst)}`}
          </span>
          <UrenStand mensen={mensen} />
        </>
      }
      rechts={
        <Budgetregel
          budget={budgetSom}
          geschreven={geschreven}
          gepland={gepland}
          links={ingepland}
          noot={regelStatus(budgetSom, geschreven, gepland)}
        />
      }
    >
      <div className={styles.uitklap}>
        {mappen.map(({ map, regels }) => (
          <Fragment key={map.id || map.naam}>
            {mappen.length > 1 && <h3 className={eigen.blokKop}>{map.naam}</h3>}
            <ul className={styles.regels}>
              {regels.map((regel) => (
                <Regel
                  key={regel.id}
                  regel={regel}
                  mensen={mensen}
                  periode="in 4 weken"
                />
              ))}
            </ul>
          </Fragment>
        ))}
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
