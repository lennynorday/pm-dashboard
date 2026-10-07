import { notFound } from "next/navigation";
import { addPlatformAction, savePlatformAction } from "@/app/actions";
import { AccountForm } from "@/components/AccountForm";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { metLegeRijen, toFormWaarden } from "@/lib/account-form";
import { LEEG_PLATFORM } from "@/lib/accountgegevens";
import { loadDashboard } from "@/lib/dashboard";

const HOME = { label: "Overzicht", href: "/" };

type Props = {
  slug: string;
  /** Een nieuw platform voor de klant van het platform met deze slug. */
  nieuw: boolean;
};

/** Bewerken van een platform, of een nieuw platform toevoegen aan dezelfde klant. */
export async function PlatformFormulier({ slug, nieuw }: Props) {
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading
          title={nieuw ? "Platform toevoegen" : "Gegevens bewerken"}
          crumbs={[HOME]}
        />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const platform = dashboard.platforms.find((item) => item.slug === slug);
  if (!platform) notFound();

  const href = `/platforms/${slug}`;
  const heading = (
    <PageHeading
      title={
        nieuw
          ? `Platform toevoegen aan ${platform.klant.naam}`
          : `${platform.naam} bewerken`
      }
      crumbs={[HOME, { label: platform.naam, href }]}
    />
  );

  // Zonder actuele gegevens zou opslaan wat er in Superhuman staat overschrijven.
  if (dashboard.gegevensFout) {
    return (
      <>
        {heading}
        <Melding titel="Bewerken kan nu niet" role="alert">
          {`De accountgegevens konden niet uit Superhuman worden opgehaald. ${dashboard.gegevensFout}`}
        </Melding>
      </>
    );
  }

  const gegevens = nieuw
    ? LEEG_PLATFORM
    : { ...platform.gegevens, naam: platform.naam };

  return (
    <>
      {heading}
      <AccountForm
        action={(nieuw ? addPlatformAction : savePlatformAction).bind(
          null,
          slug,
        )}
        waarden={metLegeRijen(toFormWaarden(platform.klant.velden, gegevens))}
        orbitNaam={platform.klant.orbitNaam}
        terugHref={href}
      />
    </>
  );
}
