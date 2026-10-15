import { connection } from "next/server";
import { Feed } from "@/components/Feed";
import { HiddenProjects } from "@/components/HiddenProjects";
import { Overige } from "@/components/Overige";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { Slas } from "@/components/Slas";
import { Sprints } from "@/components/Sprints";
import { isSla } from "@/lib/budgetsignaal";
import { loadDashboard } from "@/lib/dashboard";
import { bouwFeed } from "@/lib/feed";
import { readGenegeerd } from "@/lib/genegeerde-meldingen";
import { fetchAccountJira } from "@/lib/jira/overview";
import { voortgang } from "@/lib/orbit/achtergrond";
import { fetchProjectBudget } from "@/lib/orbit/budget";
import { laadOverige, laadSprints } from "@/lib/orbit/sprint";
import { currentUser } from "@/lib/session";
import styles from "./grid.module.css";

export default async function HomePage() {
  await connection();
  const [dashboard, user] = await Promise.all([loadDashboard(), currentUser()]);

  if (dashboard.status !== "ok" || !user) {
    return (
      <>
        <PageHeading title="Overzicht" />
        {dashboard.status !== "ok" && <OrbitStatus dashboard={dashboard} />}
      </>
    );
  }

  const bronnen = await Promise.all(
    dashboard.platforms
      .map((platform) => ({
        platform,
        projecten: platform.projecten.filter(
          (p) => p.mijn && p.zichtbaarheid === "zichtbaar",
        ),
      }))
      .filter(({ projecten }) => projecten.length > 0)
      .map(async ({ platform, projecten }) => {
        const [jira, budgetten] = await Promise.all([
          fetchAccountJira(platform),
          Promise.all(
            projecten.map((project) =>
              fetchProjectBudget(user.email, project.number),
            ),
          ),
        ]);
        return {
          platform,
          jira,
          projecten: projecten.map((project, index) => ({
            project,
            budget: budgetten[index],
          })),
        };
      }),
  );
  const slas = bronnen.flatMap(({ platform, jira, projecten }) =>
    projecten
      .filter(({ project }) => isSla(project.naam))
      .map((rij) => ({ ...rij, platform, support: jira.support })),
  );
  const sprints = laadSprints(
    user.email,
    bronnen.flatMap(({ platform, projecten }) =>
      projecten
        .filter(({ project }) => !isSla(project.naam))
        .map((rij) => ({ ...rij, platform })),
    ),
    new Date(),
  );
  const sprintNummers = sprints.rijen.map(({ project }) => project.number);
  const overig = laadOverige(
    user.email,
    bronnen.flatMap(({ platform, projecten }) =>
      projecten
        .filter(
          ({ project }) =>
            !isSla(project.naam) && !sprintNummers.includes(project.number),
        )
        .map((rij) => ({ ...rij, platform })),
    ),
    new Date(),
  );
  const genegeerd = readGenegeerd(user.email);
  const feed = bouwFeed(bronnen, dashboard.platforms, new Date());
  const verborgen = dashboard.platforms
    .flatMap((platform) => platform.projecten)
    .filter((project) => project.zichtbaarheid === "verborgen");

  return (
    <>
      <PageHeading
        title="Overzicht"
        aside={<OrbitStatus dashboard={dashboard} />}
      />
      {voortgang() && (
        <p className={styles.muted} role="status">
          Nog even geduld, we halen alles voor je op uit Orbit. Dat kan een paar
          minuten duren.
        </p>
      )}
      <Feed
        items={feed.filter((item) => !genegeerd.includes(item.id))}
        genegeerd={feed.filter((item) => genegeerd.includes(item.id)).length}
      />
      {bronnen.length === 0 ? (
        <p className={styles.muted}>
          Je bent eigenaar van geen open projecten.
        </p>
      ) : (
        <>
          <Sprints lading={sprints} />
          <Slas rijen={slas} vandaag={new Date()} />
          <Overige rijen={overig} />
        </>
      )}
      <HiddenProjects projecten={verborgen} />
    </>
  );
}
