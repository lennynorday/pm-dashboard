import { formatDate, formatTime } from "@/lib/format";
import type { AccountJira, JiraOverzicht, Telling } from "@/lib/jira/overview";
import { isVerlopen } from "@/lib/signals";
import { BoardIcon, ClockIcon, ExternalIcon, MessageIcon } from "./icons";
import { JiraMessage } from "./JiraMessage";
import styles from "./TicketKaarten.module.css";

type Props = { data: AccountJira };

function Aantal({
  label,
  telling,
  wacht,
}: {
  label: string;
  telling: Telling;
  wacht?: boolean;
}) {
  return (
    <li className={wacht ? styles.wacht : undefined}>
      <a href={telling.url} target="_blank" rel="noopener noreferrer">
        <span>{label}</span>
        <strong>{telling.aantal}</strong>
        <span className="visually-hidden"> (opent in nieuw tabblad)</span>
      </a>
    </li>
  );
}

function Sublink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className={styles.sublink}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalIcon className={styles.extern} />
      <span className="visually-hidden"> (opent in nieuw tabblad)</span>
    </a>
  );
}

function LopendeSprint({ overzicht }: { overzicht: JiraOverzicht }) {
  if (overzicht.actieveSprints.length === 0) {
    return <p className={styles.meta}>Geen lopende sprint</p>;
  }
  const nu = new Date();
  return (
    <ul className={styles.sprints}>
      {overzicht.actieveSprints.map((sprint) => {
        const datum = sprint.einddatum
          ? formatDate(sprint.einddatum.slice(0, 10))
          : null;
        return (
          <li key={sprint.naam} className={styles.meta}>
            Lopende sprint{" "}
            <a
              href={overzicht.perBak.actief.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {sprint.naam}
              <span className="visually-hidden"> (opent in nieuw tabblad)</span>
            </a>
            {" · "}
            {isVerlopen(sprint, nu) ? (
              <span className={styles.verlopen}>
                <ClockIcon className={styles.klok} />
                Einddatum {datum} is verstreken
              </span>
            ) : datum ? (
              `loopt tot ${datum}`
            ) : (
              "geen einddatum"
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Jira en Beheer & Support als losse kaarten op de platformpagina. */
export function TicketKaarten({ data }: Props) {
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
  const jira = data.jira.flatMap(({ key, result }) =>
    result.status === "ok" ? [{ key, overzicht: result.data }] : [],
  );
  const support = data.support?.status === "ok" ? data.support.data : null;

  return (
    <>
      {(nietVerbonden || fouten.length > 0) && (
        <div className={styles.meldingen}>
          {nietVerbonden && (
            <JiraMessage jiraKey="Jira" result={{ status: "niet-verbonden" }} />
          )}
          {fouten.map(({ key, result }) => (
            <JiraMessage key={key} jiraKey={key} result={result} />
          ))}
        </div>
      )}
      <div className={styles.kaarten}>
        {data.jira.length === 0 && (
          <section className={styles.kaart} aria-labelledby="jira-geen">
            <header className={styles.kop}>
              <span className={styles.bron}>
                <BoardIcon />
              </span>
              <h3 id="jira-geen" className={styles.titel}>
                Jira
              </h3>
            </header>
            <p className={styles.meta}>Geen Jira-project ingesteld</p>
          </section>
        )}
        {jira.map(({ key, overzicht }) => (
          <section
            key={key}
            className={styles.kaart}
            aria-labelledby={`jira-${key}`}
          >
            <header className={styles.kop}>
              <span className={styles.bron}>
                <BoardIcon />
              </span>
              <div>
                <h3 id={`jira-${key}`} className={styles.titel}>
                  Jira
                </h3>
                <Sublink href={overzicht.boardUrl}>{`Project ${key}`}</Sublink>
              </div>
            </header>
            <ul className={styles.aantallen}>
              <Aantal
                label="In actieve sprint"
                telling={overzicht.perBak.actief}
              />
              <Aantal
                label="Gepland voor sprint"
                telling={overzicht.perBak.gepland}
              />
              <Aantal label="In backlog" telling={overzicht.perBak.backlog} />
            </ul>
            <LopendeSprint overzicht={overzicht} />
          </section>
        ))}
        <section className={styles.kaart} aria-labelledby="support">
          <header className={styles.kop}>
            <span className={styles.bron}>
              <MessageIcon />
            </span>
            <div>
              <h3 id="support" className={styles.titel}>
                Beheer &amp; Support
              </h3>
              {support && (
                <Sublink href={support.open.url}>
                  {`Organisatie ${support.organizations.join(", ")}`}
                </Sublink>
              )}
            </div>
          </header>
          {support ? (
            <>
              <ul className={styles.aantallen}>
                <Aantal label="Open" telling={support.open} />
                <Aantal
                  label="Wachten op ons"
                  telling={support.opNorday}
                  wacht
                />
              </ul>
              <p className={styles.meta}>
                Tickets opgehaald om{" "}
                <time dateTime={support.fetchedAt.toISOString()}>
                  {formatTime(support.fetchedAt)}
                </time>
              </p>
            </>
          ) : (
            data.support === null && (
              <p className={styles.meta}>Geen supportorganisatie ingesteld</p>
            )
          )}
        </section>
      </div>
    </>
  );
}
