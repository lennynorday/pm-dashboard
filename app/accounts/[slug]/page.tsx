import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card } from "@/components/Card";
import { HiddenProjects } from "@/components/HiddenProjects";
import { LinkList } from "@/components/LinkList";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { ProjectList } from "@/components/ProjectList";
import { loadDashboard } from "@/lib/dashboard";
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

  const zichtbaar = account.projecten.filter(
    (p) => p.zichtbaarheid === "zichtbaar",
  );
  const verborgen = account.projecten.filter(
    (p) => p.zichtbaarheid === "verborgen",
  );

  return (
    <>
      <PageHeading title={account.naam} crumbs={[HOME]} />
      <OrbitStatus dashboard={dashboard} />
      <div className={styles.grid}>
        <Card title="Gegevens" accent>
          <dl className={styles.facts}>
            <dt>Account manager</dt>
            <dd>{account.am ?? "Nog niet ingesteld"}</dd>
            <dt>Contactpersonen</dt>
            <dd>
              {account.contactpersonen.length === 0 && "Nog niet ingesteld"}
              {account.contactpersonen.length > 0 && (
                <ul className={styles.plainList}>
                  {account.contactpersonen.map((persoon) => (
                    <li key={persoon.naam}>
                      {persoon.naam}
                      {persoon.rol && `, ${persoon.rol}`}
                      {persoon.email && (
                        <>
                          {" "}
                          <a href={`mailto:${persoon.email}`}>
                            {persoon.email}
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </Card>
        <Card title="Links">
          <LinkList links={account.links} />
        </Card>
      </div>
      <section className={styles.section} aria-labelledby="projecten">
        <h2 id="projecten" className={styles.sectionTitle}>
          Projecten
        </h2>
        {zichtbaar.length === 0 && (
          <p className={styles.muted}>Geen zichtbare projecten.</p>
        )}
        {zichtbaar.length > 0 && (
          <Card title={`${zichtbaar.length} open`} headingLevel="h3">
            <ProjectList projecten={zichtbaar} />
          </Card>
        )}
        <HiddenProjects projecten={verborgen} />
      </section>
    </>
  );
}
