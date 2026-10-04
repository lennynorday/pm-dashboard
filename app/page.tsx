import { connection } from "next/server";
import { AccountTile } from "@/components/AccountTile";
import { AttentionBand } from "@/components/AttentionBand";
import { HiddenProjects } from "@/components/HiddenProjects";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
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

  const accounts = await Promise.all(
    dashboard.accounts
      .map((account) => ({
        account,
        zichtbaar: account.projecten.filter(
          (p) => p.zichtbaarheid === "zichtbaar",
        ),
      }))
      .filter(({ zichtbaar }) => zichtbaar.length > 0)
      .map(async (item) => ({
        ...item,
        data: await fetchAccountJira(item.account),
      })),
  );
  const nu = new Date();
  const signalen = accounts.flatMap(({ account, data }) =>
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
          Accounts
        </h2>
        <div className={styles.grid}>
          {accounts.map(({ account, zichtbaar, data }) => (
            <AccountTile
              key={account.slug}
              account={account}
              projecten={zichtbaar}
              data={data}
            />
          ))}
        </div>
      </section>
      <HiddenProjects projecten={verborgen} />
    </>
  );
}
