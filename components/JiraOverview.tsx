import type {
  ActieveSprint,
  JiraOverzicht,
  JiraResult,
} from "@/lib/jira/overview";
import { formatDate, formatTime } from "@/lib/format";
import { Card } from "./Card";
import { ExternalLink } from "./ExternalLink";
import { JiraMessage } from "./JiraMessage";
import styles from "./JiraOverview.module.css";

type Props = {
  jiraKey: string;
  result: JiraResult<JiraOverzicht>;
  headingLevel?: "h2" | "h3";
};

function isBlocked(status: string): boolean {
  return /blocked|geblokkeerd/i.test(status);
}

function isVerlopen(sprint: ActieveSprint, nu: Date): boolean {
  return sprint.einddatum !== null && new Date(sprint.einddatum) < nu;
}

function SprintRegel({ sprints }: { sprints: ActieveSprint[] }) {
  if (sprints.length === 0) {
    return <p className={styles.sprint}>Geen actieve sprint</p>;
  }
  const nu = new Date();
  return (
    <ul className={styles.sprints}>
      {sprints.map((sprint) => {
        const datum = sprint.einddatum
          ? formatDate(sprint.einddatum.slice(0, 10))
          : null;
        if (isVerlopen(sprint, nu)) {
          return (
            <li
              key={sprint.naam}
              className={`${styles.sprint} ${styles.verlopen}`}
            >
              <span aria-hidden="true">⚠ </span>
              {sprint.naam}: einddatum {datum} verstreken, sprint nog niet
              afgesloten
            </li>
          );
        }
        return (
          <li key={sprint.naam} className={styles.sprint}>
            {sprint.naam}
            {datum && `, eindigt ${datum}`}
          </li>
        );
      })}
    </ul>
  );
}

export function JiraOverview({ jiraKey, result, headingLevel = "h2" }: Props) {
  if (result.status !== "ok") {
    return (
      <Card title={`Jira ${jiraKey}`} headingLevel={headingLevel}>
        <JiraMessage result={result} />
      </Card>
    );
  }

  const overzicht = result.data;
  const tegels = [
    { label: "Actieve sprint", ...overzicht.perBak.actief },
    { label: "Gepland", ...overzicht.perBak.gepland },
    { label: "Backlog", ...overzicht.perBak.backlog },
    { label: "Open bugs", ...overzicht.openBugs },
    { label: "Op QA", ...overzicht.opQa },
  ];

  return (
    <Card title={`Jira ${jiraKey}`} headingLevel={headingLevel}>
      <SprintRegel sprints={overzicht.actieveSprints} />
      <ul className={styles.stats}>
        {tegels.map((tegel) => (
          <li key={tegel.label}>
            <ExternalLink href={tegel.url} className={styles.statLink}>
              <span className={styles.number}>{tegel.aantal}</span>
              <span className={styles.statLabel}>{tegel.label}</span>
            </ExternalLink>
          </li>
        ))}
      </ul>

      {overzicht.perStatus.length === 0 && (
        <p className={styles.muted}>Geen open tickets.</p>
      )}
      {overzicht.perStatus.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">
              Open tickets in {jiraKey} per status en per sprintbak
            </caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Sprint</th>
                <th scope="col">Gepland</th>
                <th scope="col">Backlog</th>
                <th scope="col">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {overzicht.perStatus.map((status) => (
                <tr
                  key={status.status}
                  className={
                    isBlocked(status.status) ? styles.blocked : undefined
                  }
                >
                  <th scope="row">
                    <ExternalLink href={status.url}>
                      {isBlocked(status.status) && (
                        <span aria-hidden="true">⚠ </span>
                      )}
                      {status.status}
                    </ExternalLink>
                  </th>
                  <td>{status.perBak.actief}</td>
                  <td>{status.perBak.gepland}</td>
                  <td>{status.perBak.backlog}</td>
                  <td className={styles.total}>{status.aantal}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">
                  <ExternalLink href={overzicht.totaal.url}>
                    Alle open tickets
                  </ExternalLink>
                </th>
                <td>{overzicht.perBak.actief.aantal}</td>
                <td>{overzicht.perBak.gepland.aantal}</td>
                <td>{overzicht.perBak.backlog.aantal}</td>
                <td className={styles.total}>{overzicht.totaal.aantal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className={styles.footer}>
        <span>
          Opgehaald om{" "}
          <time dateTime={overzicht.fetchedAt.toISOString()}>
            {formatTime(overzicht.fetchedAt)}
          </time>
        </span>
        <ExternalLink href={overzicht.boardUrl}>Board {jiraKey}</ExternalLink>
      </p>
    </Card>
  );
}
