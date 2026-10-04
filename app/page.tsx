import NextLink from "next/link";
import { connection } from "next/server";
import { Card } from "@/components/Card";
import { HiddenProjects } from "@/components/HiddenProjects";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { ProjectList } from "@/components/ProjectList";
import { loadDashboard } from "@/lib/dashboard";
import styles from "./grid.module.css";

export default async function HomePage() {
  await connection();
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Mijn accounts" />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const accounts = dashboard.accounts
    .map((account) => ({
      account,
      zichtbaar: account.projecten.filter(
        (p) => p.zichtbaarheid === "zichtbaar",
      ),
    }))
    .filter(({ zichtbaar }) => zichtbaar.length > 0);
  const verborgen = dashboard.accounts
    .flatMap((account) => account.projecten)
    .filter((project) => project.zichtbaarheid === "verborgen");

  return (
    <>
      <PageHeading title="Mijn accounts" />
      <OrbitStatus dashboard={dashboard} />
      <div className={styles.grid}>
        {accounts.map(({ account, zichtbaar }) => (
          <Card
            key={account.slug}
            title={
              <NextLink href={`/accounts/${account.slug}`}>
                {account.naam}
              </NextLink>
            }
          >
            <ProjectList projecten={zichtbaar} />
          </Card>
        ))}
      </div>
      <HiddenProjects projecten={verborgen} />
    </>
  );
}
