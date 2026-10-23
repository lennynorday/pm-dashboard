import { RefreshIcon } from "./icons";
import inbox from "./Inbox.module.css";
import styles from "./InboxLaden.module.css";

/** Op de plek van de lijst zolang Slack en Gmail synchroniseren. */
export function InboxLaden() {
  return (
    <section className={inbox.paneel} aria-busy="true" aria-label="Inbox">
      <p className={styles.status} role="status">
        <RefreshIcon className={styles.icoon} />
        Slack en Gmail ophalen…
      </p>
      <ul className={inbox.lijst} aria-hidden="true">
        {[0, 1, 2].map((nummer) => (
          <li key={nummer} className={`nd-row ${inbox.item} ${styles.leeg}`}>
            <span className={styles.regel} />
            <span className={styles.regel} />
            <span className={styles.regel} />
          </li>
        ))}
      </ul>
    </section>
  );
}
