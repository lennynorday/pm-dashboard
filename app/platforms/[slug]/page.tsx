import NextLink from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { addEigenLinkAction, ontkoppelProjectAction } from "@/app/actions";
import { AccountPeople } from "@/components/AccountPeople";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { LinkGroepen } from "@/components/LinkGroepen";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PencilIcon } from "@/components/icons";
import { ProjectLijst } from "@/components/MijnProjecten";
import { PageHeading } from "@/components/PageHeading";
import { TicketKaarten } from "@/components/TicketKaarten";
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
      zichtbaar.map((project) =>
        fetchProjectBudget(user.email, project.number),
      ),
    ),
  ]);
  const signalen = platformSignalen(platform, data, new Date());

  return (
    <>
      <PageHeading
        title={platform.naam}
        crumbs={[HOME]}
        titelActie={
          <>
            <NextLink
              href={`/platforms/${platform.slug}/bewerken`}
              className={styles.rondeKnop}
              aria-label="Gegevens bewerken"
              title="Gegevens bewerken"
            >
              <PencilIcon className={styles.rondIcoon} />
            </NextLink>
            <NextLink
              href={`/platforms/${platform.slug}/nieuw`}
              className={styles.bewerken}
            >
              Platform toevoegen
              <span className="visually-hidden">
                {" "}
                aan {platform.klant.naam}
              </span>
            </NextLink>
          </>
        }
        aside={<OrbitStatus dashboard={dashboard} />}
      >
        <AccountPeople
          klant={platform.klant.naam}
          pms={platform.pms}
          am={platform.klant.am}
          contactpersonen={platform.contactpersonen}
        />
      </PageHeading>
      {dashboard.gegevensFout && (
        <div className={styles.melding}>
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
        </div>
      )}
      <AttentionBand signalen={signalen} />

      <section className={styles.section} aria-labelledby="links">
        <h2 id="links" className={styles.sectionTitle}>
          Links
        </h2>
        <LinkGroepen
          links={platform.links}
          eigenLinks={platform.eigenLinks}
          toevoegen={
            platform.klant.orbitId && !dashboard.gegevensFout
              ? addEigenLinkAction.bind(null, platform.slug)
              : undefined
          }
        />
      </section>

      <section
        className={`${styles.section} ${styles.kaart}`}
        aria-labelledby="projecten"
      >
        <h2 id="projecten" className={styles.sectionTitle}>
          Projecten
        </h2>
        {zichtbaar.length === 0 ? (
          <p className={styles.muted}>Geen zichtbare projecten.</p>
        ) : (
          <ProjectLijst
            rijen={zichtbaar.map((project, index) => ({
              project,
              budget: budgetten[index],
            }))}
            feiten={{
              ontkoppel: platform.klant.meerPlatforms
                ? ontkoppelProjectAction.bind(null, platform.slug)
                : undefined,
            }}
          />
        )}
        <HiddenProjects projecten={verborgen} />
      </section>

      <section className={styles.section} aria-labelledby="tickets">
        <h2 id="tickets" className={styles.sectionTitle}>
          Tickets
        </h2>
        <TicketKaarten data={data} />
      </section>
    </>
  );
}
