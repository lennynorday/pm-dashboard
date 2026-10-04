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

  const { open, organizations, fetchedAt } = result.data;
  return (
    <Card title="Beheer & Support" headingLevel={headingLevel}>
      <ul className={styles.stats}>
        <li className={styles.stat}>
          <ExternalLink href={open.url} className={styles.statLink}>
            <span className={styles.number}>{open.aantal}</span>
            <span className={styles.statLabel}>Open supporttickets</span>
          </ExternalLink>
        </li>
      </ul>
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
