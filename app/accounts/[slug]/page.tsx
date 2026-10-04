import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AccountPeople } from "@/components/AccountPeople";
import { AccountProjects } from "@/components/AccountProjects";
import { Card } from "@/components/Card";
import { HiddenProjects } from "@/components/HiddenProjects";
import { JiraOverview } from "@/components/JiraOverview";
import { LinkList } from "@/components/LinkList";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { SupportOverview } from "@/components/SupportOverview";
import { loadDashboard } from "@/lib/dashboard";
import { fetchJiraOverzicht, fetchSupportOverzicht } from "@/lib/jira/overview";
import styles from "../../grid.module.css";

const HOME = { label: "Mijn accounts", href: "/" };

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

  const [jira, support] = await Promise.all([
    Promise.all(
      account.jiraKeys.map(async (key) => ({
        key,
        result: await fetchJiraOverzicht(key),
      })),
    ),
    account.supportOrganizations.length > 0
      ? fetchSupportOverzicht(account.supportOrganizations)
      : null,
  ]);

  const zichtbaar = account.projecten.filter(
    (p) => p.zichtbaarheid === "zichtbaar",
  );
  const verborgen = account.projecten.filter(
    (p) => p.zichtbaarheid === "verborgen",
  );

  return (
    <>
      <PageHeading title={account.naam} crumbs={[HOME]}>
        <AccountPeople
          am={account.am}
          contactpersonen={account.contactpersonen}
        />
      </PageHeading>
      <OrbitStatus dashboard={dashboard} />

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
          {jira.map(({ key, result }) => (
            <JiraOverview
              key={key}
              jiraKey={key}
              result={result}
              headingLevel="h3"
            />
          ))}
          <SupportOverview result={support} headingLevel="h3" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="links">
        <h2 id="links" className={styles.sectionTitle}>
          Links
        </h2>
        <Card title="Account" headingLevel="h3">
          <LinkList links={account.links} />
        </Card>
      </section>
    </>
  );
}
