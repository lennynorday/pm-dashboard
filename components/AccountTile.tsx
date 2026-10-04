import NextLink from "next/link";
import type { Account, Project } from "@/lib/dashboard";
import type { AccountJira } from "@/lib/jira/overview";
import { ExternalLink } from "./ExternalLink";
import { ProjectList } from "./ProjectList";
import styles from "./AccountTile.module.css";

type Props = {
  account: Account;
  projecten: Project[];
  data: AccountJira;
};

function Aantal({ aantal, url }: { aantal: number; url: string }) {
  return (
    <ExternalLink href={url} className={styles.aantal}>
      {aantal}
    </ExternalLink>
  );
}

/** Eén account op de homepagina: Jira, support en zichtbare projecten. */
export function AccountTile({ account, projecten, data }: Props) {
  const { jira, support } = data;
  return (
    <section
      className={styles.tile}
      aria-labelledby={`account-${account.slug}`}
    >
      <h3 id={`account-${account.slug}`} className={styles.naam}>
        <NextLink href={`/accounts/${account.slug}`}>{account.naam}</NextLink>
      </h3>

      {jira.length > 0 && (
        <table className={styles.tabel}>
          <caption className="visually-hidden">
            Open Jira-tickets van {account.naam}
          </caption>
          <thead>
            <tr>
              <th scope="col">Jira</th>
              <th scope="col">Sprint</th>
              <th scope="col">Gepland</th>
              <th scope="col">Backlog</th>
            </tr>
          </thead>
          <tbody>
            {jira.map(({ key, result }) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                {result.status === "ok" ? (
                  <>
                    <td className={styles.live}>
                      <Aantal {...result.data.perBak.actief} />
                    </td>
                    <td>
                      <Aantal {...result.data.perBak.gepland} />
                    </td>
                    <td>
                      <Aantal {...result.data.perBak.backlog} />
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className={styles.leeg}>
                    {result.status === "fout"
                      ? "Niet opgehaald"
                      : "Jira niet ingesteld"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={styles.support}>
        <span className={styles.supportLabel}>Support</span>
        {support === null && (
          <span className={styles.leeg}>Geen Organization ingesteld</span>
        )}
        {support?.status === "ok" && (
          <span className={styles.supportCijfers}>
            <ExternalLink href={support.data.open.url}>
              {support.data.open.aantal} open
            </ExternalLink>
            {support.data.opNorday.aantal > 0 && (
              <ExternalLink
                href={support.data.opNorday.url}
                className={styles.opNorday}
              >
                {support.data.opNorday.aantal} wacht op ons
              </ExternalLink>
            )}
          </span>
        )}
        {support !== null && support.status !== "ok" && (
          <span className={styles.leeg}>
            {support.status === "fout" ? "Niet opgehaald" : "Niet ingesteld"}
          </span>
        )}
      </p>

      <div className={styles.projecten}>
        <ProjectList projecten={projecten} />
      </div>
    </section>
  );
}
