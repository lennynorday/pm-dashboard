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
