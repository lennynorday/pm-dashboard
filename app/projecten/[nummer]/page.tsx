import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card } from "@/components/Card";
import { ExternalLink } from "@/components/ExternalLink";
import { LinkList } from "@/components/LinkList";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { VisibilityButton } from "@/components/VisibilityButton";
import { jiraBoardUrl, loadDashboard, orbitProjectUrl } from "@/lib/dashboard";
import {
  BILLING_MODE_LABELS,
  formatDate,
  PROJECT_STATE_LABELS,
} from "@/lib/format";
import styles from "../../grid.module.css";

const HOME = { label: "Mijn accounts", href: "/" };

export default async function ProjectPage({
  params,
}: PageProps<"/projecten/[nummer]">) {
  await connection();
  const { nummer } = await params;
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Project" crumbs={[HOME]} />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const project = dashboard.accounts
    .flatMap((account) => account.projecten)
    .find((item) => item.number === nummer);
  if (!project) notFound();

  const crumbs = [
    HOME,
    { label: project.accountNaam, href: `/accounts/${project.accountSlug}` },
  ];

  return (
    <>
      <PageHeading title={project.naam} crumbs={crumbs} />
      <OrbitStatus dashboard={dashboard} />
      <div className={styles.grid}>
        <Card title="Gegevens" accent>
          <dl className={styles.facts}>
            <dt>Projectnummer</dt>
            <dd>
              {project.number}{" "}
              <ExternalLink href={orbitProjectUrl(project.number)}>
                Openen in Orbit
              </ExternalLink>
            </dd>
            <dt>Status</dt>
            <dd>{PROJECT_STATE_LABELS[project.status]}</dd>
            <dt>Afrekenwijze</dt>
            <dd>
              {project.afrekenwijze
                ? BILLING_MODE_LABELS[project.afrekenwijze]
                : "Onbekend"}
            </dd>
            <dt>Einddatum</dt>
            <dd>
              {project.einddatum ? formatDate(project.einddatum) : "Geen"}
            </dd>
            <dt>Zichtbaarheid</dt>
            <dd>
              <VisibilityButton project={project} />
            </dd>
          </dl>
        </Card>
        <Card title="Jira">
          {project.jiraKeys.length === 0 && (
            <p className={styles.muted}>Nog geen Jira-key ingesteld.</p>
          )}
          {project.jiraKeys.length > 0 && (
            <ul className={styles.plainList}>
              {project.jiraKeys.map((key) => (
                <li key={key}>
                  <ExternalLink href={jiraBoardUrl(key)}>
                    Board {key}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Links">
          <LinkList links={project.links} />
        </Card>
      </div>
    </>
  );
}
