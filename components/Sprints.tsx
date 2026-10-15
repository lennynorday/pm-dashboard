import { BUDGET_MELDING, regelStatus } from "@/lib/budgetsignaal";
import { formatUren } from "@/lib/format";
import type { Schrijfregel } from "@/lib/orbit/budget-tekst";
import type { Cachet, SprintLading, SprintRij } from "@/lib/orbit/sprint";
import {
  achterTekst,
  dagLabel,
  initialen,
  somRegels,
  vorigeTekst,
  type Mensen,
  type Persoon,
} from "@/lib/sprint";
import { Budgetregel } from "./Budgetregel";
import { CheckIcon, PencilIcon } from "./icons";
import { OrbitLink } from "./OrbitLink";
import styles from "./Sectie.module.css";
import eigen from "./Sprints.module.css";
import { Uitklapper } from "./Uitklapper";

function Personen({
  personen,
  periode,
}: {
  personen: Persoon[];
  periode: string;
}) {
  if (personen.length === 0) {
    return <p className={eigen.niemand}>Niemand schreef hierop {periode}</p>;
  }
  return (
    <ul className={eigen.mensen}>
      {personen.map((persoon) => (
        <li key={persoon.naam} data-ok={persoon.ok}>
          <span className={eigen.ini} aria-hidden="true">
            {initialen(persoon.naam)}
          </span>
          <span className={eigen.wie}>{persoon.naam}</span>
          <span className={eigen.uren}>{formatUren(persoon.minuten)}u</span>
          <span className={eigen.tm}>
            {persoon.ok && persoon.bijTm ? (
              <>
                <CheckIcon />
                bij t/m {dagLabel(persoon.bijTm)}
              </>
            ) : (
              <>
                <PencilIcon />
                {persoon.laatste
                  ? `laatst ${dagLabel(persoon.laatste)}`
                  : `niets ${periode}`}
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Onder de projectnaam: uren compleet, of wie er achterloopt. */
export function UrenStand({ mensen }: { mensen: Cachet<Mensen> }) {
  if (mensen.status !== "ok") {
    return (
      <span className={eigen.bij} data-ok="muted">
        {mensen.status === "laden"
          ? "Uren worden opgehaald"
          : "Uren konden niet worden opgehaald"}
      </span>
    );
  }
  const { achter, compleetTm } = mensen.data;
  if (achter.length > 0) {
    return (
      <span className={eigen.bij} data-ok="false">
        <PencilIcon className={eigen.bijIcoon} />
        {achterTekst(achter)}
      </span>
    );
  }
  if (!compleetTm) return null;
  return (
    <span className={eigen.bij} data-ok="true">
      <CheckIcon className={eigen.bijIcoon} />
      Uren compleet t/m {dagLabel(compleetTm)}
    </span>
  );
}

/** Een taak met de mensen die erop schrijven of gepland staan. */
export function Regel({
  regel,
  mensen,
  periode,
}: {
  regel: Schrijfregel;
  mensen: Cachet<Mensen>;
  periode: string;
}) {
  return (
    <li className={styles.sub}>
      <div className={styles.regelNaam}>
        {regel.naam}
        {mensen.status === "ok" && (
          <Personen
            personen={mensen.data.perRegel[regel.naam] ?? []}
            periode={periode}
          />
        )}
      </div>
      <Budgetregel
        budget={regel.beschikbaar}
        geschreven={regel.geschreven}
        gepland={regel.gepland}
        noot={regelStatus(regel.beschikbaar, regel.geschreven, regel.gepland)}
      />
    </li>
  );
}

function Sprint({ rij }: { rij: SprintRij }) {
  const { project, platform, budget, sprint, mensen } = rij;
  const titel = project.naam;
  if (budget.status !== "ok") {
    return (
      <Uitklapper
        titel={titel}
        rechts={
          <span className={styles.melding}>
            {BUDGET_MELDING[budget.status]}
          </span>
        }
      />
    );
  }
  if (!sprint) {
    return (
      <Uitklapper
        titel={titel}
        onder={<span className={styles.meta}>{platform.klant.naam}</span>}
        rechts={
          <span className={styles.melding}>
            Geen sprint in Orbit gevonden bij de planning
          </span>
        }
      />
    );
  }
  const { map, hierna, wanneer } = sprint;
  const budgetSom = somRegels(map.regels, "beschikbaar");
  const geschreven = somRegels(map.regels, "geschreven");
  const gepland = somRegels(map.regels, "gepland");
  return (
    <Uitklapper
      titel={titel}
      onder={
        <>
          <span className={styles.meta}>
            {map.naam} · {wanneer}
          </span>
          <UrenStand mensen={mensen} />
        </>
      }
      rechts={
        <Budgetregel
          budget={budgetSom}
          geschreven={geschreven}
          gepland={gepland}
          links={vorigeTekst(sprint.vorige)}
          noot={regelStatus(budgetSom, geschreven, gepland)}
        />
      }
    >
      <div className={styles.uitklap}>
        <ul className={styles.regels}>
          {map.regels.map((regel) => (
            <Regel
              key={regel.id}
              regel={regel}
              mensen={mensen}
              periode="deze sprint"
            />
          ))}
        </ul>
        {hierna.length > 0 && (
          <>
            <h3 className={eigen.blokKop}>Hierna</h3>
            <ul className={styles.regels}>
              {hierna.map((komend) => {
                const budgetKomend = somRegels(komend.regels, "beschikbaar");
                const geplandKomend = somRegels(komend.regels, "gepland");
                return (
                  <li key={komend.id || komend.naam} className={styles.sub}>
                    <div className={styles.regelNaam}>{komend.naam}</div>
                    <Budgetregel
                      budget={budgetKomend}
                      geschreven={0}
                      gepland={geplandKomend}
                      noot={regelStatus(budgetKomend, 0, geplandKomend)}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className={styles.voet}>
          <OrbitLink project={project} />
        </div>
      </div>
    </Uitklapper>
  );
}

/** Mijn sprints: de huidige sprint per project met planning vorige, deze of volgende week. */
export function Sprints({ lading }: { lading: SprintLading }) {
  const { rijen, laden, fout } = lading;
  return (
    <section className={styles.kaart} aria-labelledby="sprints-kop">
      <div className={styles.kaartKop}>
        <h2 id="sprints-kop" className={styles.kaartTitel}>
          Sprints
        </h2>
        <span className={styles.kopUitleg}>
          Sprints met planning vorige, deze of volgende week
        </span>
      </div>
      {rijen.length === 0 && laden === 0 && fout === 0 && (
        <p className={eigen.leeg}>
          Geen sprints met planning vorige, deze of volgende week
        </p>
      )}
      <ul className={styles.rijen}>
        {rijen.map((rij) => (
          <li key={rij.project.number}>
            <Sprint rij={rij} />
          </li>
        ))}
      </ul>
      {(laden > 0 || fout > 0) && (
        <p className={eigen.leeg} role="status">
          {laden > 0 &&
            `Van ${laden} project(en) wordt de planning opgehaald. `}
          {fout > 0 &&
            `Van ${fout} project(en) kon de planning niet worden opgehaald uit Orbit.`}
        </p>
      )}
    </section>
  );
}
