import type {
  ActieveSprint,
  JiraOverzicht,
  JiraResult,
} from "@/lib/jira/overview";
import { formatDate, formatTime } from "@/lib/format";
import { isVerlopen } from "@/lib/signals";
import { Card } from "./Card";
import { ExternalLink } from "./ExternalLink";
import { JiraMessage } from "./JiraMessage";
import { ClockIcon } from "./icons";
import styles from "./JiraOverview.module.css";

type Props = {
  jiraKey: string;
  result: JiraResult<JiraOverzicht>;
  headingLevel?: "h2" | "h3";
};

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
        return (
          <li key={sprint.naam} className={styles.sprint}>
            <span className={styles.sprintNaam}>{sprint.naam}</span>
            {isVerlopen(sprint, nu) ? (
              <span className={styles.verlopen}>
                <ClockIcon className={styles.verlopenIcoon} />
                Verlopen op {datum}
              </span>
            ) : (
              datum && <span>Eindigt {datum}</span>
            )}
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
    { label: "Actieve sprint", live: true, ...overzicht.perBak.actief },
    { label: "Gepland", live: false, ...overzicht.perBak.gepland },
    { label: "Backlog", live: false, ...overzicht.perBak.backlog },
  ];

  return (
    <Card title={`Jira ${jiraKey}`} headingLevel={headingLevel}>
      <SprintRegel sprints={overzicht.actieveSprints} />
      <ul className={styles.stats}>
        {tegels.map((tegel) => (
          <li
            key={tegel.label}
            className={tegel.live ? styles.live : undefined}
          >
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
