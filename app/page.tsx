import { connection } from "next/server";
import { Feed } from "@/components/Feed";
import { HiddenProjects } from "@/components/HiddenProjects";
import { MijnProjecten } from "@/components/MijnProjecten";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { loadDashboard } from "@/lib/dashboard";
import { bouwFeed } from "@/lib/feed";
import { readGenegeerd } from "@/lib/genegeerde-meldingen";
import { readFavorieten } from "@/lib/favorieten";
import { fetchAccountJira } from "@/lib/jira/overview";
import { voortgang } from "@/lib/orbit/achtergrond";
import { fetchProjectBudget } from "@/lib/orbit/budget";
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
        <MijnProjecten
          favorieten={readFavorieten(user.email)}
          rijen={bronnen.map(({ platform, jira, projecten }) => ({
            platform,
            support: jira.support,
            projecten,
          }))}
        />
      )}
      <HiddenProjects projecten={verborgen} />
    </>
  );
}
