import NextLink from "next/link";
import type { Platform, Project } from "@/lib/dashboard";
import type { AccountJira, Telling } from "@/lib/jira/overview";
import { projectHref } from "@/lib/navigation";
import { ExternalLink } from "./ExternalLink";
import styles from "./TicketTable.module.css";

export type TicketRij = {
  platform: Platform;
  projecten: Project[];
  data: AccountJira;
};

type Props = {
  rijen: TicketRij[];
  caption: string;
  /** Op de platformpagina zijn de kolommen met platform en projecten overbodig. */
  toonAccount?: boolean;
};

function Aantal({ telling, label }: { telling: Telling; label: string }) {
  return (
    <ExternalLink href={telling.url} className={styles.aantal}>
      {telling.aantal}
      <span className="visually-hidden"> {label}</span>
    </ExternalLink>
  );
}

function AccountCel({ rij, rowSpan }: { rij: TicketRij; rowSpan: number }) {
  const { platform, projecten } = rij;
  return (
    <th scope="row" rowSpan={rowSpan} className={styles.platform}>
      <NextLink href={`/platforms/${platform.slug}`} className={styles.naam}>
        {platform.naam}
      </NextLink>
      <ul className={styles.projecten}>
        {projecten.map((project) => (
          <li key={project.number}>
            <NextLink href={projectHref(platform.slug, project.number)}>
              {project.naam}
            </NextLink>
          </li>
        ))}
      </ul>
    </th>
  );
}

function VerbindJira() {
  return <a href="/api/jira/login">Verbinden met Jira</a>;
}

function SupportCellen({
  data,
  rowSpan,
}: {
  data: AccountJira;
  rowSpan: number;
}) {
  const { support } = data;
  if (support === null || support.status !== "ok") {
    const tekst =
      support === null ? (
        "Geen supportorganisatie ingesteld"
      ) : support.status === "fout" ? (
        "Ophalen mislukt"
      ) : (
        <VerbindJira />
      );
    return (
      <td colSpan={2} rowSpan={rowSpan} className={styles.leeg}>
        {tekst}
      </td>
    );
  }
  const { open, opNorday } = support.data;
  return (
    <>
      <td rowSpan={rowSpan} className={styles.getal}>
        <Aantal telling={open} label="open supporttickets" />
      </td>
      <td
        rowSpan={rowSpan}
        className={`${styles.getal} ${opNorday.aantal > 0 ? styles.wacht : ""}`}
      >
        <Aantal telling={opNorday} label="supporttickets wachten op ons" />
      </td>
    </>
  );
}

/** Open tickets in Jira en Beheer & Support, één rij per Jira-project. */
export function TicketTable({ rijen, caption, toonAccount = true }: Props) {
  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className={styles.tabel}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {toonAccount && <th scope="col">Platform en projecten</th>}
            <th scope="col">Jira-project</th>
            <th scope="col" className={styles.getal}>
              In actieve sprint
            </th>
            <th scope="col" className={styles.getal}>
              Gepland voor sprint
            </th>
            <th scope="col" className={styles.getal}>
              In backlog
            </th>
            <th scope="col" className={styles.getal}>
              Supporttickets open
            </th>
            <th scope="col" className={styles.getal}>
              Wachten op ons
            </th>
          </tr>
        </thead>
        {rijen.map((rij) => {
          const keys = rij.data.jira.length > 0 ? rij.data.jira : [null];
          return (
            <tbody key={rij.platform.slug} className={styles.groep}>
              {keys.map((item, index) => (
                <tr key={item?.key ?? "geen"}>
                  {toonAccount && index === 0 && (
                    <AccountCel rij={rij} rowSpan={keys.length} />
                  )}
                  {item === null ? (
                    <td colSpan={4} className={styles.leeg}>
                      Geen Jira-project ingesteld
                    </td>
                  ) : item.result.status === "ok" ? (
                    <>
                      <td className={styles.key}>
                        <ExternalLink href={item.result.data.boardUrl}>
                          {item.key}
                        </ExternalLink>
                      </td>
                      <td className={`${styles.getal} ${styles.live}`}>
                        <Aantal
                          telling={item.result.data.perBak.actief}
                          label="in actieve sprint"
                        />
                      </td>
                      <td className={styles.getal}>
                        <Aantal
                          telling={item.result.data.perBak.gepland}
                          label="gepland voor sprint"
                        />
                      </td>
                      <td className={styles.getal}>
                        <Aantal
                          telling={item.result.data.perBak.backlog}
                          label="in backlog"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={styles.key}>{item.key}</td>
                      <td colSpan={3} className={styles.leeg}>
                        {item.result.status === "fout" ? (
                          "Ophalen mislukt"
                        ) : (
                          <VerbindJira />
                        )}
                      </td>
                    </>
                  )}
                  {index === 0 && (
                    <SupportCellen data={rij.data} rowSpan={keys.length} />
                  )}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
