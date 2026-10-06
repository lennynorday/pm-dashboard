import { notFound } from "next/navigation";
import { saveAccountAction } from "@/app/actions";
import { AccountForm } from "@/components/AccountForm";
import { Melding } from "@/components/Melding";
import { OrbitStatus } from "@/components/OrbitStatus";
import { PageHeading } from "@/components/PageHeading";
import { metLegeRijen, toFormWaarden } from "@/lib/account-form";
import { LEGE_GEGEVENS, readAccountGegevens } from "@/lib/accountgegevens";
import { loadDashboard } from "@/lib/dashboard";

const HOME = { label: "Overzicht", href: "/" };

export default async function AccountBewerkenPage({
  params,
}: PageProps<"/accounts/[slug]/bewerken">) {
  const { slug } = await params;
  const dashboard = await loadDashboard();

  if (dashboard.status !== "ok") {
    return (
      <>
        <PageHeading title="Gegevens bewerken" crumbs={[HOME]} />
        <OrbitStatus dashboard={dashboard} />
      </>
    );
  }

  const account = dashboard.accounts.find((item) => item.slug === slug);
  if (!account) notFound();

  const href = `/accounts/${slug}`;
  const { gegevens, fout } = await readAccountGegevens();
  const heading = (
    <PageHeading
      title={`${account.naam} bewerken`}
      crumbs={[HOME, { label: account.naam, href }]}
    />
  );

  // Zonder actuele gegevens zou opslaan wat er in Superhuman staat overschrijven.
  if (fout) {
    return (
      <>
        {heading}
        <Melding titel="Bewerken kan nu niet" role="alert">
          {`De accountgegevens konden niet uit Superhuman worden opgehaald. ${fout}`}
        </Melding>
      </>
    );
  }

  return (
    <>
      {heading}
      <AccountForm
        action={saveAccountAction.bind(null, slug)}
        waarden={metLegeRijen(
          toFormWaarden(
            (account.orbitId && gegevens[account.orbitId]) || LEGE_GEGEVENS,
          ),
        )}
        orbitNaam={account.orbitNaam}
        terugHref={href}
      />
    </>
  );
}
