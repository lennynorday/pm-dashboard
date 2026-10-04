import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccountPeople } from "@/components/AccountPeople";
import { AccountProjects } from "@/components/AccountProjects";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { JiraOverview } from "@/components/JiraOverview";
import { LinkList } from "@/components/LinkList";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { SupportOverview } from "@/components/SupportOverview";
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
        <AccountPeople
          am={account.am}
          contactpersonen={account.contactpersonen}
        />
      </PageHeading>
      <AttentionBand signalen={signalen} toonAccount={false} />

      <section className={styles.section} aria-labelledby="projecten">
        <h2 id="projecten" className={styles.sectionTitle}>
          Projecten
        </h2>
        {zichtbaar.length === 0 && (
          <p className={styles.muted}>Geen zichtbare projecten.</p>
        )}
        <AccountProjects projecten={zichtbaar} />
        <HiddenProjects projecten={verborgen} />
      </section>

      <section className={styles.section} aria-labelledby="jira">
        <h2 id="jira" className={styles.sectionTitle}>
          Jira en support
        </h2>
        <div className={styles.grid}>
          {data.jira.map(({ key, result }) => (
            <JiraOverview
              key={key}
              jiraKey={key}
              result={result}
              headingLevel="h3"
            />
          ))}
          <SupportOverview result={data.support} headingLevel="h3" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="links">
        <h2 id="links" className={styles.sectionTitle}>
          Links
        </h2>
        <LinkList links={account.links} />
      </section>
    </>
  );
}
