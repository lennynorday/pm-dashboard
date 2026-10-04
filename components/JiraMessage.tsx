import styles from "./JiraOverview.module.css";

type Props = {
  result: { status: "niet-ingesteld" } | { status: "fout"; message: string };
};

/** Melding in een Jira-blok als de data niet beschikbaar is. */
export function JiraMessage({ result }: Props) {
  if (result.status === "niet-ingesteld") {
    return (
      <p className={styles.message} role="status">
        <span aria-hidden="true">⚠ </span>
        Jira is nog niet ingesteld. Zet het token in .env.local.
      </p>
    );
  }
  return (
    <p className={styles.message} role="alert">
      <span aria-hidden="true">⚠ </span>
      Ophalen uit Jira is mislukt: {result.message}
    </p>
  );
}
