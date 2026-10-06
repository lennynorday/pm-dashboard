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
import { fetchProjectBudget } from "@/lib/orbit/budget";
import { currentUser } from "@/lib/session";
import { platformSignalen } from "@/lib/signals";
import styles from "../../grid.module.css";

const HOME = { label: "Overzicht", href: "/" };

export default async function PlatformPage({
  params,
}: PageProps<"/platforms/[slug]">) {
  await connection();
  const { slug } = await params;
  const [dashboard, user] = await Promise.all([loadDashboard(), currentUser()]);

  if (dashboard.status !== "ok" || !user) {
    return (
      <>
        <PageHeading title="Platform" crumbs={[HOME]} />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const platform = dashboard.platforms.find((item) => item.slug === slug);
  if (!platform) notFound();

  const zichtbaar = platform.projecten.filter(
    (p) => p.zichtbaarheid === "zichtbaar",
  );
  const verborgen = platform.projecten.filter(
    (p) => p.zichtbaarheid === "verborgen",
  );
  const [data, budgetten] = await Promise.all([
    fetchAccountJira(platform),
    Promise.all(
      zichtbaar.map(
        async (project) =>
          [
            project.number,
            await fetchProjectBudget(user.email, project.number),
          ] as const,
      ),
    ),
  ]);
  const signalen = platformSignalen(platform, data, new Date());

  return (
    <>
      <PageHeading
        title={platform.naam}
        crumbs={[HOME]}
        aside={<OrbitStatus dashboard={dashboard} />}
      >
        <div className={styles.acties}>
          <NextLink
            href={`/platforms/${platform.slug}/bewerken`}
            className={styles.bewerken}
          >
            Gegevens bewerken
          </NextLink>
          <NextLink
            href={`/platforms/${platform.slug}/nieuw`}
            className={styles.bewerken}
          >
            Platform toevoegen
            <span className="visually-hidden"> aan {platform.klant.naam}</span>
          </NextLink>
        </div>
        <AccountPeople
          klant={platform.klant.naam}
          pms={platform.pms}
          am={platform.klant.am}
          contactpersonen={platform.contactpersonen}
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
        <AccountProjects
          projecten={zichtbaar}
          budgetten={Object.fromEntries(budgetten)}
        />
        <HiddenProjects projecten={verborgen} />
      </section>

      <section className={styles.section} aria-labelledby="jira">
        <h2 id="jira" className={styles.sectionTitle}>
          Tickets
        </h2>
        <TicketTable
          rijen={[{ platform, projecten: zichtbaar, data }]}
          caption={`Open tickets van ${platform.naam} in Jira en Beheer & Support`}
          toonAccount={false}
        />
        <TicketDetails data={data} />
      </section>

      <section className={styles.section} aria-labelledby="links">
        <h2 id="links" className={styles.sectionTitle}>
          Links van dit platform
        </h2>
        <LinkList links={platform.links} />
      </section>
    </>
  );
}
