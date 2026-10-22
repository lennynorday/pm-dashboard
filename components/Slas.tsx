import {
  BUDGET_MELDING,
  looptijdProcent,
  slaStatus,
} from "@/lib/budgetsignaal";
import type { Platform, Project } from "@/lib/dashboard";
import { formatUren } from "@/lib/format";
import type { JiraResult, SupportOverzicht } from "@/lib/jira/overview";
import type { ProjectBudgetResult, Schrijfregel } from "@/lib/orbit/budget";
import { Budgetregel } from "./Budgetregel";
import { AlertIcon, ExternalIcon } from "./icons";
import { OrbitLink } from "./OrbitLink";
import { type Beheer, projectHref } from "./Sprints";
import { SupportKnop } from "./SupportKnop";
import styles from "./Sectie.module.css";
import { Uitklapper } from "./Uitklapper";

export type SlaRij = {
  platform: Platform;
  project: Project;
  budget: ProjectBudgetResult;
  support: JiraResult<SupportOverzicht> | null;
};

const dagMaand = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
});

/** "1 jan – 31 dec"; met jaartal als de start in een ander jaar valt dan dit jaar. */
function looptijd(start: string | null, vandaag: Date): string {
  const jaar = vandaag.getFullYear();
  if (!start || start <= `${jaar}-01-01`) return "1 jan – 31 dec";
  const begin = dagMaand.format(new Date(`${start}T12:00:00`)).replace(".", "");
  const startJaar = Number(start.slice(0, 4));
  return startJaar === jaar
    ? `${begin} – 31 dec`
    : `${begin} ${startJaar} – 31 dec ${startJaar}`;
}

function Regel({ regel }: { regel: Schrijfregel }) {
  const { beschikbaar, geschreven, gepland } = regel;
  const op =
    regel.afgesloten || (geschreven >= beschikbaar - 3 && gepland === 0);
  const over = beschikbaar - geschreven - gepland;
  return (
    <li className={styles.sub} data-op={op}>
      <span className={styles.regelNaam}>{regel.naam}</span>
      <span className={styles.meldingen} />
      <Budgetregel
        budget={beschikbaar}
        geschreven={geschreven}
        gepland={gepland}
        noot={
          op
            ? { soort: "rustig", icoon: "check", tekst: "Op" }
            : over < 0
              ? {
                  soort: "rustig",
                  icoon: "alert",
                  tekst: `${formatUren(-over)}u te veel`,
                }
              : {
                  soort: "rustig",
                  icoon: "clock",
                  tekst: `${formatUren(over)}u over`,
                }
        }
      />
    </li>
  );
}

function Sla({
  rij: { platform, project, budget, support },
  vandaag,
  beheer,
  zonderSupport,
}: {
  rij: SlaRij;
  vandaag: Date;
  beheer?: Beheer;
  zonderSupport?: boolean;
}) {
  const start = budget.status === "ok" ? budget.data.start : null;
  const onder = (
    <span className={styles.meta}>
      {platform.klant.naam} ·{" "}
      {/* Vaste spaties: "1 jan – 31 dec" breekt niet af. */}
      {looptijd(start, vandaag).replaceAll(" ", "\u00a0")}
    </span>
  );
  const kop = {
    titel: project.naam,
    href: projectHref(platform, project),
    onder,
    status: zonderSupport ? undefined : (
      <SupportKnop platform={platform} support={support} />
    ),
  };

  if (budget.status !== "ok") {
    return (
      <Uitklapper
        {...kop}
        rechts={
          <span className={styles.melding}>
            {BUDGET_MELDING[budget.status]}
          </span>
        }
      >
        {beheer && <div className={styles.voet}>{beheer(project)}</div>}
      </Uitklapper>
    );
  }

  const regels = budget.data.mappen
    .filter((map) => /change/i.test(map.naam))
    .flatMap((map) => map.regels);
  const voet = (
    <div className={styles.voet}>
      <OrbitLink project={project} />
      {support?.status === "ok" && (
        <a
          href={support.data.open.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalIcon className={styles.voetIcoon} />
          Beheer &amp; Support in Jira
          <span className="visually-hidden"> (opent in nieuw tabblad)</span>
        </a>
      )}
      {beheer?.(project)}
    </div>
  );

  if (regels.length === 0) {
    return (
      <Uitklapper
        {...kop}
        rechts={
          <span className={styles.leeg}>
            <span className={styles.leegTitel}>
              Geen map met &quot;change&quot; in Orbit
            </span>
            <span className={styles.leegNoot}>
              <AlertIcon className={styles.leegIcoon} />
              Geen pot gevonden
            </span>
          </span>
        }
      >
        <p className={styles.leegUitleg}>
          Het dashboard zoekt de pot in de Orbit-map met &quot;change&quot; in
          de naam. Dit project heeft die niet.
        </p>
        {voet}
      </Uitklapper>
    );
  }

  const som = (veld: "beschikbaar" | "geschreven" | "gepland") =>
    regels.reduce((totaal, regel) => totaal + regel[veld], 0);
  const tijd = looptijdProcent(start, vandaag);
  const budgetSom = som("beschikbaar");
  const geschrevenSom = som("geschreven");
  return (
    <Uitklapper
      {...kop}
      rechts={
        <Budgetregel
          budget={budgetSom}
          geschreven={geschrevenSom}
          gepland={som("gepland")}
          tijdProcent={tijd}
          noot={
            start !== null && Date.parse(start) > vandaag.getTime()
              ? { soort: "rustig", icoon: "clock", tekst: "Nog niet gestart" }
              : slaStatus(budgetSom, geschrevenSom, tijd)
          }
        />
      }
    >
      <ul className={styles.regels}>
        {regels.map((regel) => (
          <Regel key={regel.id} regel={regel} />
        ))}
      </ul>
      {voet}
    </Uitklapper>
  );
}

/** Mijn SLA's: de jaarpot change-uren tegen de verstreken tijd; zonder SLA's niets. */
export function Slas({
  rijen,
  vandaag,
  beheer,
  zonderSupport,
}: {
  rijen: SlaRij[];
  vandaag: Date;
  beheer?: Beheer;
  /** Zonder de knop naar de supporttickets, zoals op de platformpagina met een eigen Tickets-blok. */
  zonderSupport?: boolean;
}) {
  if (rijen.length === 0) return null;
  return (
    <section className={`nd-card ${styles.kaart}`} aria-labelledby="sla-kop">
      <div className="nd-card__head">
        <h2 id="sla-kop" className="nd-title">
          SLA&apos;s
        </h2>
        <span className="nd-meta">
          Uren tegen de verstreken tijd van de pot
        </span>
      </div>
      <ul className={styles.rijen}>
        {rijen.map((rij) => (
          <li key={rij.project.number} id={`project-${rij.project.number}`}>
            <Sla
              rij={rij}
              vandaag={vandaag}
              beheer={beheer}
              zonderSupport={zonderSupport}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
