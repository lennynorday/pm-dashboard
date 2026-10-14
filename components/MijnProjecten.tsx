import NextLink from "next/link";
import type { Platform, Project } from "@/lib/dashboard";
import { orbitProjectUrl } from "@/lib/dashboard";
import { formatDate, formatUren, PROJECT_STATE_LABELS } from "@/lib/format";
import type { JiraResult, SupportOverzicht } from "@/lib/jira/overview";
import {
  type BudgetMap,
  plafond,
  type ProjectBudget,
  type ProjectBudgetResult,
} from "@/lib/orbit/budget";
import { AlertIcon, ChevronIcon, ExternalIcon } from "./icons";
import { VisibilityButton } from "./VisibilityButton";
import knop from "./VisibilityButton.module.css";
import styles from "./MijnProjecten.module.css";

export type ProjectRij = { project: Project; budget: ProjectBudgetResult };

export type PlatformRij = {
  platform: Platform;
  support: JiraResult<SupportOverzicht> | null;
  projecten: ProjectRij[];
};

function procent(geschreven: number, totaal: number): number {
  return totaal === 0 ? 0 : Math.round((geschreven / totaal) * 100);
}

function sorteerwaarde({ budget }: ProjectRij): number {
  return budget.status === "ok" ? plafond(budget.data).minuten : 0;
}

function Balk({ percentage, klein }: { percentage: number; klein?: boolean }) {
  return (
    <span
      className={`${styles.balk} ${klein ? styles.klein : ""}`}
      data-over={percentage > 100}
      aria-hidden="true"
    >
      <span style={{ width: `${Math.min(percentage, 100)}%` }} />
    </span>
  );
}

function Cel({ label, children }: { label: string; children: string }) {
  return (
    <span className={styles.getal}>
      <span className={`visually-hidden ${styles.celLabel}`}>{label}: </span>
      {children}
    </span>
  );
}

/** Lila knop naar de open supporttickets, of waarom die er niet is. */
function SupportKnop({
  platform,
  support,
}: Pick<PlatformRij, "platform" | "support">) {
  if (support === null) {
    return (
      <p className={styles.muted}>
        Geen Beheer &amp; Support gekoppeld ·{" "}
        <NextLink href={`/platforms/${platform.slug}/bewerken`}>
          Organization koppelen
        </NextLink>
      </p>
    );
  }
  if (support.status !== "ok") {
    return (
      <p className={styles.muted}>
        {support.status === "fout" ? (
          "Supporttickets konden niet worden opgehaald"
        ) : (
          <a href="/api/jira/login">Verbinden met Jira</a>
        )}
      </p>
    );
  }
  const { open } = support.data;
  return (
    <a
      href={open.url}
      className={styles.support}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.supportAantal}>{open.aantal}</span>
      {open.aantal === 1 ? "open supportticket" : "open supporttickets"}
      <ExternalIcon className={styles.supportIcoon} />
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}

function MapRijen({ map }: { map: BudgetMap }) {
  const beschikbaar = map.regels.reduce((som, r) => som + r.beschikbaar, 0);
  const geschreven = map.regels.reduce((som, r) => som + r.geschreven, 0);
  const percentage = procent(geschreven, beschikbaar);
  return (
    <li>
      <div className={`${styles.rij} ${styles.mapRij}`}>
        <span className={styles.naamCel}>{map.naam}</span>
        <Balk percentage={percentage} klein />
        <Cel label="Verbruikt">
          {beschikbaar === 0 ? "–" : `${percentage}%`}
        </Cel>
        <Cel label="Geschreven">{formatUren(geschreven)}</Cel>
        <Cel label="Beschikbaar">{formatUren(beschikbaar)}</Cel>
        <Cel label="Offerte">–</Cel>
        <span />
      </div>
      <ul className={styles.regels}>
        {map.regels.map((regel, index) => (
          <li
            key={`${regel.naam}-${index}`}
            className={`${styles.rij} ${styles.regelRij}`}
          >
            <span className={styles.naamCel}>
              {regel.naam}
              {regel.afgesloten && (
                <span className={styles.afgesloten}> (afgesloten)</span>
              )}
            </span>
            <Balk
              percentage={procent(regel.geschreven, regel.beschikbaar)}
              klein
            />
            <Cel label="Verbruikt">
              {regel.beschikbaar === 0
                ? "–"
                : `${procent(regel.geschreven, regel.beschikbaar)}%`}
            </Cel>
            <Cel label="Geschreven">{formatUren(regel.geschreven)}</Cel>
            <Cel label="Beschikbaar">{formatUren(regel.beschikbaar)}</Cel>
            <Cel label="Offerte">–</Cel>
            <span />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Naam van het project met de Teamleader-link als pijlicoon erachter. */
function Naam({ project, uitklap }: { project: Project; uitklap: boolean }) {
  return (
    <span className={styles.naamCel}>
      {uitklap && <ChevronIcon className={styles.chevron} />}
      <span className={styles.naam}>{project.naam}</span>
      <a
        href={orbitProjectUrl(project.number)}
        className={styles.teamleader}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.naam} openen in Teamleader (opent in nieuw tabblad)`}
      >
        <ExternalIcon className={styles.teamleaderIcoon} />
      </a>
    </span>
  );
}

function Cijfers({ project, data }: { project: Project; data: ProjectBudget }) {
  const { minuten, soort } = plafond(data);
  const percentage = procent(data.geschreven, minuten);
  const over = data.geschreven > minuten;
  const offerte =
    data.offerte.status === "ok" && data.offerte.minuten > 0
      ? formatUren(data.offerte.minuten)
      : data.offerte.status === "fout"
        ? "?"
        : "geen";
  return (
    <>
      <Naam project={project} uitklap />
      <Balk percentage={percentage} />
      <span className={`${styles.getal} ${styles.pct}`} data-over={over}>
        <span className={`visually-hidden ${styles.celLabel}`}>
          Verbruikt van {soort}:{" "}
        </span>
        {percentage}%
      </span>
      <Cel label="Geschreven">{formatUren(data.geschreven)}</Cel>
      <Cel label="Beschikbaar">{formatUren(data.beschikbaar)}</Cel>
      <Cel label="Offerte">{offerte}</Cel>
      <span className={styles.status}>
        {over && (
          <span className={styles.over}>
            <AlertIcon className={styles.overIcoon} />+
            {formatUren(data.geschreven - minuten)} u
            <span className="visually-hidden"> boven {soort}</span>
          </span>
        )}
      </span>
    </>
  );
}

type Feiten = {
  /** Haalt een project van dit platform af; alleen bij klanten met meer platforms. */
  ontkoppel?: (formData: FormData) => Promise<void>;
};

/** Projectnummer, status, looptijd en de knoppen, in de uitgeklapte regel. */
function FeitenRij({ project, ontkoppel }: { project: Project } & Feiten) {
  return (
    <div className={styles.feiten}>
      <span>
        Projectnummer: <strong>{project.number}</strong>
      </span>
      <span>
        Status:{" "}
        <strong>{PROJECT_STATE_LABELS[project.status].toLowerCase()}</strong>
      </span>
      {project.einddatum && (
        <span>
          Loopt tot <strong>{formatDate(project.einddatum)}</strong>
        </span>
      )}
      <span className={styles.feitKnoppen}>
        {ontkoppel && (
          <form action={ontkoppel}>
            <input type="hidden" name="projectnummer" value={project.number} />
            <button type="submit" className={knop.button}>
              Ontkoppelen
              <span className="visually-hidden">: {project.naam}</span>
            </button>
          </form>
        )}
        <VisibilityButton project={project} />
      </span>
    </div>
  );
}

function ProjectItem({
  project,
  budget,
  feiten,
}: ProjectRij & { feiten?: Feiten }) {
  const data =
    budget.status === "ok" && plafond(budget.data).minuten > 0
      ? budget.data
      : null;
  const melding = {
    ok: "Geen uren gepland in Orbit",
    laden: "Wordt opgehaald",
    fout: "Budget kon niet worden opgehaald uit Orbit",
    "niet-verbonden": "Niet verbonden met Orbit",
  }[budget.status];

  if (!data && !feiten) {
    return (
      <li id={`project-${project.number}`} className={styles.project}>
        <div className={`${styles.rij} ${styles.projectRij}`}>
          <Naam project={project} uitklap={false} />
          <span className={styles.melding}>{melding}</span>
        </div>
      </li>
    );
  }

  // SLA-projecten tonen de change-map altijd, ook ingeklapt.
  const change = /\bSLA\b/i.test(project.naam)
    ? data?.mappen.find((map) => /change/i.test(map.naam))
    : undefined;
  const overig = data?.mappen.filter((map) => map !== change) ?? [];

  return (
    <li id={`project-${project.number}`} className={styles.project}>
      <details>
        <summary className={`${styles.rij} ${styles.projectRij}`}>
          {data ? (
            <Cijfers project={project} data={data} />
          ) : (
            <>
              <Naam project={project} uitklap />
              <span className={styles.melding}>{melding}</span>
            </>
          )}
        </summary>
        <div className={styles.uitklap}>
          {feiten && <FeitenRij project={project} {...feiten} />}
          {overig.length > 0 && (
            <ul className={styles.mappen}>
              {overig.map((map) => (
                <MapRijen key={map.id || map.naam} map={map} />
              ))}
            </ul>
          )}
        </div>
      </details>
      {change && (
        <ul className={`${styles.mappen} ${styles.uitklap}`}>
          <MapRijen map={change} />
        </ul>
      )}
    </li>
  );
}

/**
 * Projecten met hun budget, grootste urenbudget eerst. Met `feiten` staan
 * projectnummer, status, looptijd en de knoppen in de uitgeklapte regel.
 */
export function ProjectLijst({
  rijen,
  feiten,
}: {
  rijen: ProjectRij[];
  feiten?: Feiten;
}) {
  return (
    <div className={styles.lijst}>
      <div className={`${styles.rij} ${styles.kolomKop}`} aria-hidden="true">
        <span>Project</span>
        <span>Verbruik</span>
        <span className={styles.getal}>%</span>
        <span className={styles.getal}>Geschreven</span>
        <span className={styles.getal}>Beschikbaar</span>
        <span className={styles.getal}>Offerte</span>
        <span>Status</span>
      </div>
      <ul className={styles.projecten}>
        {[...rijen]
          .sort((a, b) => sorteerwaarde(b) - sorteerwaarde(a))
          .map((rij) => (
            <ProjectItem key={rij.project.number} {...rij} feiten={feiten} />
          ))}
      </ul>
    </div>
  );
}

/** Mijn platforms, elk als kaart met de supportknop en de projecten. */
export function MijnProjecten({ rijen }: { rijen: PlatformRij[] }) {
  return (
    <div className={styles.platforms}>
      {rijen.map(({ platform, support, projecten }) => (
        <section
          key={platform.slug}
          className={styles.kaart}
          aria-labelledby={`platform-${platform.slug}`}
        >
          <header className={styles.kop}>
            <h2
              id={`platform-${platform.slug}`}
              className={styles.platformNaam}
            >
              <NextLink href={`/platforms/${platform.slug}`}>
                {platform.naam}
              </NextLink>
              {platform.klant.meerPlatforms && (
                <span className={styles.klant}> · {platform.klant.naam}</span>
              )}
            </h2>
            <SupportKnop platform={platform} support={support} />
          </header>
          <ProjectLijst rijen={projecten} />
        </section>
      ))}
    </div>
  );
}
