import { connection } from "next/server";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { TicketTable } from "@/components/TicketTable";
import { loadDashboard } from "@/lib/dashboard";
import { fetchAccountJira } from "@/lib/jira/overview";
import { accountSignalen } from "@/lib/signals";
import styles from "./grid.module.css";

export default async function HomePage() {
  await connection();
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Overzicht" />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const rijen = await Promise.all(
    dashboard.accounts
      .filter((account) => account.mijn)
      .map((account) => ({
        account,
        projecten: account.projecten.filter(
          (p) => p.zichtbaarheid === "zichtbaar",
        ),
      }))
      .filter(({ projecten }) => projecten.length > 0)
      .map(async (item) => ({
        ...item,
        data: await fetchAccountJira(item.account),
      })),
  );
  const nu = new Date();
  const signalen = rijen.flatMap(({ account, data }) =>
    accountSignalen(account, data, nu),
  );
  const verborgen = dashboard.accounts
    .flatMap((account) => account.projecten)
    .filter((project) => project.zichtbaarheid === "verborgen");

  return (
    <>
      <PageHeading
        title="Overzicht"
        aside={<OrbitStatus dashboard={dashboard} />}
      />
      <AttentionBand signalen={signalen} />
      <section aria-labelledby="accounts">
        <h2 id="accounts" className={styles.sectionTitle}>
          Mijn accounts
        </h2>
        <TicketTable
          rijen={rijen}
          caption="Mijn accounts met hun open tickets in Jira en Beheer & Support"
        />
      </section>
      <HiddenProjects projecten={verborgen} />
    </>
  );
}
