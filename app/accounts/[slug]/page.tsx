import NextLink from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccountPeople } from "@/components/AccountPeople";
import { AccountProjects } from "@/components/AccountProjects";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { LinkList } from "@/components/LinkList";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { TicketDetails } from "@/components/TicketDetails";
import { TicketTable } from "@/components/TicketTable";
import { loadDashboard } from "@/lib/dashboard";
import { fetchAccountJira } from "@/lib/jira/overview";
import { accountSignalen } from "@/lib/signals";
import styles from "../../grid.module.css";

const HOME = { label: "Overzicht", href: "/" };

export default async function AccountPage({
  params,
}: PageProps<"/accounts/[slug]">) {
  await connection();
  const { slug } = await params;
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Account" crumbs={[HOME]} />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const account = dashboard.accounts.find((item) => item.slug === slug);
  if (!account) notFound();

  const data = await fetchAccountJira(account);
  const signalen = accountSignalen(account, data, new Date());
  const zichtbaar = account.projecten.filter(
    (p) => p.zichtbaarheid === "zichtbaar",
  );
  const verborgen = account.projecten.filter(
    (p) => p.zichtbaarheid === "verborgen",
  );

  return (
    <>
      <PageHeading
        title={account.naam}
        crumbs={[HOME]}
        aside={<OrbitStatus dashboard={dashboard} />}
      >
        <NextLink
          href={`/accounts/${account.slug}/bewerken`}
          className={styles.bewerken}
        >
          Gegevens bewerken
        </NextLink>
        <AccountPeople
          am={account.am}
          contactpersonen={account.contactpersonen}
        />
      </PageHeading>
      {dashboard.gegevensFout && (
        <Melding
          titel="Accountgegevens uit Superhuman zijn niet opgehaald"
          role="alert"
          actie={
            <NextLink href="/instellingen#accountgegevens">
              Instellingen
            </NextLink>
          }
        >
          {dashboard.gegevensFout}
        </Melding>
      )}
      <AttentionBand signalen={signalen} toonAccount={false} />

      <section className={styles.section} aria-labelledby="projecten">
        <h2 id="projecten" className={styles.sectionTitle}>
          Projecten in Orbit
        </h2>
        {zichtbaar.length === 0 && (
          <p className={styles.muted}>Geen zichtbare projecten.</p>
        )}
        <AccountProjects projecten={zichtbaar} />
        <HiddenProjects projecten={verborgen} />
      </section>

      <section className={styles.section} aria-labelledby="jira">
        <h2 id="jira" className={styles.sectionTitle}>
          Tickets
        </h2>
        <TicketTable
          rijen={[{ account, projecten: zichtbaar, data }]}
          caption={`Open tickets van ${account.naam} in Jira en Beheer & Support`}
          toonAccount={false}
        />
        <TicketDetails data={data} />
      </section>

      <section className={styles.section} aria-labelledby="links">
        <h2 id="links" className={styles.sectionTitle}>
          Links van dit account
        </h2>
        <LinkList links={account.links} />
      </section>
    </>
  );
}
