import NextLink from "next/link";
import type { Account, Project } from "@/lib/dashboard";
import { orbitProjectUrl } from "@/lib/dashboard";
import { formatUren } from "@/lib/format";
import type { JiraResult, SupportOverzicht } from "@/lib/jira/overview";
import {
  type BudgetMap,
  plafond,
  type ProjectBudget,
  type ProjectBudgetResult,
} from "@/lib/orbit/budget";
import { ExternalLink } from "./ExternalLink";
import styles from "./MijnProjecten.module.css";

export type ProjectRij = { project: Project; budget: ProjectBudgetResult };

export type AccountRij = {
  account: Account;
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

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SupportKolom({
  aantal,
  max,
  label,
  url,
  soort,
}: {
  aantal: number;
  max: number;
  label: string;
  url: string;
  soort: "ons" | "klant" | "overig";
}) {
  const hoogte = aantal === 0 ? 0 : Math.max(procent(aantal, max), 6);
  return (
    <a
      href={url}
      className={styles.kolom}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.kolomGetal}>{aantal}</span>
      <span className={styles.kolomBak} aria-hidden="true">
        <span data-soort={soort} style={{ height: `${hoogte}%` }} />
      </span>
      <span className={styles.kolomLabel}>{label}</span>
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}

function Support({
  account,
  support,
}: {
  account: Account;
  support: AccountRij["support"];
}) {
  if (support === null) {
    return (
      <p className={styles.muted}>
        Geen Beheer &amp; Support gekoppeld ·{" "}
        <NextLink href={`/accounts/${account.slug}/bewerken`}>
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
  const { open, opNorday, wachtOpKlant, overig } = support.data;
  const max = Math.max(opNorday.aantal, wachtOpKlant.aantal, overig.aantal);
  return (
    <>
      <details className={styles.kaart}>
        <summary className={styles.kaartKop}>
          <span className={styles.bol}>{open.aantal}</span>
          <span className={styles.kaartLabel}>Open tickets</span>
          <span className={styles.kaartPijl} aria-hidden="true">
            <Chevron />
          </span>
        </summary>
        <div className={styles.kolommen}>
          <SupportKolom
            aantal={opNorday.aantal}
            max={max}
            label="Bij ons"
            url={opNorday.url}
            soort="ons"
          />
          <SupportKolom
            aantal={wachtOpKlant.aantal}
            max={max}
            label="Wachten op de klant"
            url={wachtOpKlant.url}
            soort="klant"
          />
          {overig.aantal > 0 && (
            <SupportKolom
              aantal={overig.aantal}
              max={max}
              label="In sprint of on hold"
              url={overig.url}
              soort="overig"
            />
          )}
        </div>
      </details>
      <ExternalLink href={open.url} className={styles.subLink}>
        Openen in Beheer &amp; Support
      </ExternalLink>
    </>
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
            <span />
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

function Uitklap({ project, data }: { project: Project; data: ProjectBudget }) {
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
    <details>
      <summary className={`${styles.rij} ${styles.projectRij}`}>
        <span className={styles.naamCel}>
          <Chevron />
          <span className={styles.naam}>{project.naam}</span>
        </span>
        <Balk percentage={percentage} />
        <Cel label={`Verbruikt van ${soort}`}>{`${percentage}%`}</Cel>
        <span className={`${styles.getal} ${over ? styles.over : ""}`}>
          <span className={`visually-hidden ${styles.celLabel}`}>
            Geschreven:{" "}
          </span>
          {formatUren(data.geschreven)}
        </span>
        <Cel label="Beschikbaar">{formatUren(data.beschikbaar)}</Cel>
        <Cel label="Offerte">{offerte}</Cel>
        <span className={styles.status}>
          {over && (
            <span className={styles.label}>
              +{formatUren(data.geschreven - minuten)} u
              <span className="visually-hidden"> boven {soort}</span>
            </span>
          )}
        </span>
      </summary>
      <ul className={styles.mappen}>
        {data.mappen.map((map) => (
          <MapRijen key={map.id || map.naam} map={map} />
        ))}
      </ul>
    </details>
  );
}

function ProjectItem({ project, budget }: ProjectRij) {
  const melding =
    budget.status !== "ok"
      ? budget.status === "fout"
        ? "Budget kon niet worden opgehaald uit Orbit"
        : "Niet verbonden met Orbit"
      : plafond(budget.data).minuten === 0
        ? "Geen uren gepland in Orbit"
        : null;
  return (
    <li id={`project-${project.number}`} className={styles.project}>
      {budget.status === "ok" && melding === null ? (
        <Uitklap project={project} data={budget.data} />
      ) : (
        <div className={`${styles.rij} ${styles.projectRij}`}>
          <span className={styles.naamCel}>
            <span className={styles.naam}>{project.naam}</span>
          </span>
          <span className={styles.melding}>{melding}</span>
        </div>
      )}
      <ExternalLink
        href={orbitProjectUrl(project.number)}
        className={styles.orbit}
      >
        Openen in Teamleader
      </ExternalLink>
    </li>
  );
}

/** Mijn accounts met Beheer & Support en de projecten, grootste urenbudget eerst. */
export function MijnProjecten({ rijen }: { rijen: AccountRij[] }) {
  return (
    <div className={styles.accounts}>
      {rijen.map(({ account, support, projecten }) => (
        <section key={account.slug} aria-labelledby={`account-${account.slug}`}>
          <h2 id={`account-${account.slug}`} className={styles.accountNaam}>
            <NextLink href={`/accounts/${account.slug}`}>
              {account.naam}
            </NextLink>
          </h2>
          <div className={styles.blokken}>
            <div>
              <h3 className={styles.blokKop}>Beheer &amp; Support</h3>
              <Support account={account} support={support} />
            </div>
            <div>
              <h3 className={styles.blokKop}>Projecten</h3>
              <div
                className={`${styles.rij} ${styles.kolomKop}`}
                aria-hidden="true"
              >
                <span>Project</span>
                <span>Verbruik</span>
                <span className={styles.getal}>%</span>
                <span className={styles.getal}>Geschreven</span>
                <span className={styles.getal}>Beschikbaar</span>
                <span className={styles.getal}>Offerte</span>
                <span className={styles.getal}>Status</span>
              </div>
              <ul className={styles.projecten}>
                {[...projecten]
                  .sort((a, b) => sorteerwaarde(b) - sorteerwaarde(a))
                  .map((rij) => (
                    <ProjectItem key={rij.project.number} {...rij} />
                  ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
