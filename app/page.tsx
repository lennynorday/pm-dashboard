import { connection } from "next/server";
import { Feed } from "@/components/Feed";
import { HiddenProjects } from "@/components/HiddenProjects";
import { Overige } from "@/components/Overige";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { Slas } from "@/components/Slas";
import { Sprints } from "@/components/Sprints";
import { loadDashboard } from "@/lib/dashboard";
import { bouwFeed, eigenItems } from "@/lib/feed";
import { readGenegeerd } from "@/lib/genegeerde-meldingen";
import { fetchAccountJira, fetchStilleTickets } from "@/lib/jira/overview";
import { voortgang } from "@/lib/orbit/achtergrond";
import { fetchProjectBudget } from "@/lib/orbit/budget";
import { eigenTimesheet, verdeelProjecten } from "@/lib/orbit/sprint";
import { currentUser } from "@/lib/session";
import { isoDatum, werkdagenTerug } from "@/lib/sprint";
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
  const { slas, sprints, overig } = verdeelProjecten(
    user.email,
    bronnen.map(({ platform, jira, projecten }) => ({
      platform,
      support: jira.support,
      projecten,
    })),
    new Date(),
  );
  const vandaag = isoDatum(new Date());
  const stilSinds = werkdagenTerug(vandaag, 5);
  const eigen = eigenItems(
    eigenTimesheet(user.email, user.naam, vandaag),
    await fetchStilleTickets(stilSinds),
    vandaag,
    stilSinds,
  );
  const genegeerd = readGenegeerd(user.email);
  const feed = bouwFeed(bronnen, dashboard.platforms, new Date(), eigen);
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
