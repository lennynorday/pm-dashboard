import { notFound } from "next/navigation";
import { koppelAction } from "@/app/actions";
import { KoppelFormulier } from "@/components/KoppelFormulier";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { loadDashboard } from "@/lib/dashboard";
import styles from "../../../grid.module.css";

const HOME = { label: "Overzicht", href: "/" };

export default async function KoppelenPage({
  params,
}: PageProps<"/platforms/[slug]/koppelen">) {
  const { slug } = await params;
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Projecten koppelen" crumbs={[HOME]} />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const platform = dashboard.platforms.find((item) => item.slug === slug);
  if (!platform) notFound();

  const href = `/platforms/${slug}`;
  const { klant } = platform;
  const heading = (
    <PageHeading
      title={`Projecten van ${klant.naam} koppelen`}
      crumbs={[HOME, { label: platform.naam, href }]}
    />
  );

  if (!klant.meerPlatforms) {
    return (
      <>
        {heading}
        <p className={styles.muted}>
          {klant.naam} heeft één platform, dus alle projecten horen daar vanzelf
          bij.
        </p>
      </>
    );
  }

  // Zonder actuele gegevens zou opslaan wat er in Superhuman staat overschrijven.
  if (dashboard.gegevensFout) {
    return (
      <>
        {heading}
        <Melding titel="Koppelen kan nu niet" role="alert">
          {`De accountgegevens konden niet uit Superhuman worden opgehaald. ${dashboard.gegevensFout}`}
        </Melding>
      </>
    );
  }

  return (
    <>
      {heading}
      <p className={styles.muted}>
        Orbit weet niet bij welke website een project hoort. Kies het hier; het
        wordt bewaard in Superhuman, zodat collega&apos;s het ook zien. Kies
        &ldquo;Geen platform&rdquo; voor projecten die over de hele klant gaan.
      </p>
      <KoppelFormulier
        action={koppelAction.bind(null, slug)}
        projecten={klant.projecten}
        platforms={dashboard.platforms
          .filter((item) => item.klant === klant)
          .map((item) => item.naam)}
        terugHref={href}
      />
    </>
  );
}
