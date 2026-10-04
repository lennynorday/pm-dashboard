import type { JiraResult, SupportOverzicht } from "@/lib/jira/overview";
import { formatTime } from "@/lib/format";
import { Card } from "./Card";
import { ExternalLink } from "./ExternalLink";
import { JiraMessage } from "./JiraMessage";
import styles from "./JiraOverview.module.css";

type Props = {
  result: JiraResult<SupportOverzicht> | null;
  headingLevel?: "h2" | "h3";
};

/** Open supporttickets in SUPP; null betekent: geen Organization ingesteld. */
export function SupportOverview({ result, headingLevel = "h2" }: Props) {
  if (result === null) {
    return (
      <Card title="Beheer & Support" headingLevel={headingLevel}>
        <p className={styles.muted}>Nog geen Organization in SUPP ingesteld.</p>
      </Card>
    );
  }
  if (result.status !== "ok") {
    return (
      <Card title="Beheer & Support" headingLevel={headingLevel}>
        <JiraMessage result={result} />
      </Card>
    );
  }

  const { open, opNorday, perStatus, organizations, fetchedAt } = result.data;
  return (
    <Card title="Beheer & Support" headingLevel={headingLevel}>
      <ul className={styles.stats}>
        <li>
          <ExternalLink href={open.url} className={styles.statLink}>
            <span className={styles.number}>{open.aantal}</span>
            <span className={styles.statLabel}>Open</span>
          </ExternalLink>
        </li>
        <li className={opNorday.aantal > 0 ? styles.wacht : undefined}>
          <ExternalLink href={opNorday.url} className={styles.statLink}>
            <span className={styles.number}>{opNorday.aantal}</span>
            <span className={styles.statLabel}>Wacht op ons</span>
          </ExternalLink>
        </li>
      </ul>
      {perStatus.length > 0 && (
        <ul
          className={styles.statusList}
          aria-label="Open supporttickets per status"
        >
          {perStatus.map((status) => (
            <li key={status.status} className={styles.statusRow}>
              <ExternalLink href={status.url}>{status.status}</ExternalLink>
              <span className={styles.count}>{status.aantal}</span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footer}>
        <span>Organization: {organizations.join(", ")}</span>
        <span>
          Opgehaald om{" "}
          <time dateTime={fetchedAt.toISOString()}>
            {formatTime(fetchedAt)}
          </time>
        </span>
      </p>
    </Card>
  );
}
