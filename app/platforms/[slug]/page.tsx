import NextLink from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ontkoppelProjectAction } from "@/app/actions";
import { AccountPeople } from "@/components/AccountPeople";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { LinkGroepen } from "@/components/LinkGroepen";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { Overige } from "@/components/Overige";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { PageHeading } from "@/components/PageHeading";
import { Slas } from "@/components/Slas";
import { Sprints } from "@/components/Sprints";
import { TicketKaarten } from "@/components/TicketKaarten";
import { VisibilityButton } from "@/components/VisibilityButton";
import { loadDashboard, type Project } from "@/lib/dashboard";
import { fetchAccountJira } from "@/lib/jira/overview";
import { fetchProjectBudget } from "@/lib/orbit/budget";
import { verdeelProjecten } from "@/lib/orbit/sprint";
import { currentUser } from "@/lib/session";
import { platformSignalen } from "@/lib/signals";
import styles from "./page.module.css";

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
  const vandaag = new Date();
  const signalen = platformSignalen(platform, data, vandaag);
  const { slas, sprints, overig } = verdeelProjecten(
    user.email,
    [
      {
        platform,
        support: data.support,
        projecten: zichtbaar.map((project, index) => ({
          project,
          budget: budgetten[index],
        })),
      },
    ],
    vandaag,
  );
  const ontkoppel = platform.klant.meerPlatforms
    ? ontkoppelProjectAction.bind(null, platform.slug)
    : undefined;
  const beheer = (project: Project) => (
    <>
      {ontkoppel && (
        <form action={ontkoppel}>
          <input type="hidden" name="projectnummer" value={project.number} />
          <button
            type="submit"
            className="nd-button nd-button--quiet nd-button--small"
          >
            Ontkoppelen
            <span className="visually-hidden">: {project.naam}</span>
          </button>
        </form>
      )}
      <VisibilityButton project={project} />
    </>
  );
  const heeftSprints =
    sprints.rijen.length > 0 || sprints.laden > 0 || sprints.fout > 0;

  return (
    <>
      <PageHeading
        title={platform.naam}
        crumbs={[HOME]}
        titelActie={
          <>
            <NextLink
              href={`/platforms/${platform.slug}/bewerken`}
              className="nd-icon-button"
              aria-label="Gegevens bewerken"
              title="Gegevens bewerken"
            >
              <PencilIcon />
            </NextLink>
            <NextLink
              href={`/platforms/${platform.slug}/nieuw`}
              className="nd-icon-button"
              aria-label={`Platform toevoegen aan ${platform.klant.naam}`}
              title="Platform toevoegen"
            >
              <PlusIcon />
            </NextLink>
          </>
        }
        aside={<OrbitStatus dashboard={dashboard} />}
      />
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

      <div className={styles.werkblad}>
        <div className={styles.hoofdkolom}>
          {zichtbaar.length === 0 && (
            <p className="nd-empty">Geen zichtbare projecten.</p>
          )}
          {heeftSprints && <Sprints lading={sprints} beheer={beheer} />}
          <Slas rijen={slas} vandaag={vandaag} beheer={beheer} />
          <Overige rijen={overig} beheer={beheer} />
          <HiddenProjects projecten={verborgen} />

          <section className="nd-card" aria-labelledby="tickets">
            <div className="nd-card__head">
              <h2 id="tickets" className="nd-title">
                Tickets
              </h2>
            </div>
            <TicketKaarten data={data} />
          </section>
        </div>

        <aside className={styles.zijkolom} aria-label="Mensen en links">
          <AccountPeople
            klant={platform.klant.naam}
            pms={platform.pms}
            am={platform.klant.am}
            contactpersonen={platform.contactpersonen}
          />
          <LinkGroepen
            links={platform.links}
            eigenLinks={platform.eigenLinks}
            toevoegenVoor={
              platform.klant.orbitId && !dashboard.gegevensFout
                ? platform.slug
                : undefined
            }
          />
        </aside>
      </div>
    </>
  );
}
