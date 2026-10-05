import { formatDate, formatTime } from "@/lib/format";
import type { AccountJira } from "@/lib/jira/overview";
import { isVerlopen } from "@/lib/signals";
import { ExternalLink } from "./ExternalLink";
import { ClockIcon } from "./icons";
import { JiraMessage } from "./JiraMessage";
import styles from "./TicketDetails.module.css";

type Props = { data: AccountJira };

/** Lopende sprints en supporttickets per status, onder de tickettabel van een account. */
export function TicketDetails({ data }: Props) {
  const nu = new Date();
  const ok = data.jira.flatMap(({ key, result }) =>
    result.status === "ok" ? [{ key, overzicht: result.data }] : [],
  );
  const fouten = [
    ...data.jira,
    ...(data.support ? [{ key: "SUPP", result: data.support }] : []),
  ].flatMap(({ key, result }) =>
    result.status === "fout" ? [{ key, result }] : [],
  );
  // Niet verbonden geldt voor alle Jira-projecten tegelijk: één melding.
  const nietVerbonden = [
    ...data.jira.map(({ result }) => result),
    data.support,
  ].some((result) => result?.status === "niet-verbonden");
  const support = data.support?.status === "ok" ? data.support.data : null;
  const opgehaald = ok[0]?.overzicht.fetchedAt ?? support?.fetchedAt;

  return (
    <div className={styles.details}>
      {nietVerbonden && (
        <JiraMessage jiraKey="Jira" result={{ status: "niet-verbonden" }} />
      )}
      {fouten.map(({ key, result }) => (
        <JiraMessage key={key} jiraKey={key} result={result} />
      ))}

      {ok.length > 0 && (
        <section aria-labelledby="sprints" className={styles.blok}>
          <h3 id="sprints" className={styles.kop}>
            Lopende sprints
          </h3>
          <ul className={styles.lijst}>
            {ok.map(({ key, overzicht }) =>
              overzicht.actieveSprints.length === 0 ? (
                <li key={key} className={styles.rij}>
                  <span className={styles.label}>Jira {key}</span>
                  <span className={styles.stil}>Geen lopende sprint</span>
                </li>
              ) : (
                overzicht.actieveSprints.map((sprint) => {
                  const datum = sprint.einddatum
                    ? formatDate(sprint.einddatum.slice(0, 10))
                    : null;
                  return (
                    <li key={`${key}-${sprint.naam}`} className={styles.rij}>
                      <span className={styles.label}>Jira {key}</span>
                      <span>
                        <ExternalLink href={overzicht.perBak.actief.url}>
                          {sprint.naam}
                        </ExternalLink>
                      </span>
                      {isVerlopen(sprint, nu) ? (
                        <span className={styles.verlopen}>
                          <ClockIcon className={styles.verlopenIcoon} />
                          Einddatum {datum} is verstreken
                        </span>
                      ) : (
                        <span className={styles.stil}>
                          {datum ? `Loopt tot ${datum}` : "Geen einddatum"}
                        </span>
                      )}
                    </li>
                  );
                })
              ),
            )}
          </ul>
        </section>
      )}

      {support && support.perStatus.length > 0 && (
        <section aria-labelledby="support-status" className={styles.blok}>
          <h3 id="support-status" className={styles.kop}>
            Open supporttickets per status
          </h3>
          <ul className={styles.lijst}>
            {support.perStatus.map((status) => (
              <li key={status.status} className={styles.rij}>
                <ExternalLink href={status.url}>{status.status}</ExternalLink>
                <span className={styles.aantal}>{status.aantal}</span>
              </li>
            ))}
          </ul>
          <p className={styles.stil}>
            Supportorganisatie in Jira: {support.organizations.join(", ")}
          </p>
        </section>
      )}

      {opgehaald && (
        <p className={styles.versheid}>
          Tickets opgehaald om{" "}
          <time dateTime={opgehaald.toISOString()}>
            {formatTime(opgehaald)}
          </time>
        </p>
      )}
    </div>
  );
}
