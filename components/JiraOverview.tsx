import type { JiraOverzicht, JiraResult } from "@/lib/jira/overview";
import { formatTime } from "@/lib/format";
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

export function JiraOverview({ jiraKey, result, headingLevel = "h2" }: Props) {
  if (result.status !== "ok") {
    return (
      <Card title={`Jira ${jiraKey}`} headingLevel={headingLevel}>
        <JiraMessage result={result} />
      </Card>
    );
  }

  const overzicht = result.data;
  const kerncijfers = [
    { label: "Open", ...overzicht.totaal },
    { label: "Open bugs", ...overzicht.openBugs },
    { label: "Op QA", ...overzicht.opQa },
  ];

  return (
    <Card title={`Jira ${jiraKey}`} headingLevel={headingLevel}>
      <ul className={styles.stats}>
        {kerncijfers.map((cijfer) => (
          <li key={cijfer.label} className={styles.stat}>
            <ExternalLink href={cijfer.url} className={styles.statLink}>
              <span className={styles.number}>{cijfer.aantal}</span>
              <span className={styles.statLabel}>{cijfer.label}</span>
            </ExternalLink>
          </li>
        ))}
      </ul>

      <p className={styles.subtitle}>Per status</p>
      {overzicht.perStatus.length === 0 && (
        <p className={styles.muted}>Geen open tickets.</p>
      )}
      <ul className={styles.statuses}>
        {overzicht.perStatus.map((status) => (
          <li
            key={status.status}
            className={
              isBlocked(status.status)
                ? `${styles.row} ${styles.blocked}`
                : styles.row
            }
          >
            <ExternalLink href={status.url}>
              {isBlocked(status.status) && <span aria-hidden="true">⚠ </span>}
              {status.status}
            </ExternalLink>
            <span className={styles.count}>{status.aantal}</span>
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
