import { notFound } from "next/navigation";
import { saveAccountAction } from "@/app/actions";
import { AccountForm } from "@/components/AccountForm";
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
  const gegevens = readAccountGegevens()[slug] ?? LEGE_GEGEVENS;

  return (
    <>
      <PageHeading
        title={`${account.naam} bewerken`}
        crumbs={[HOME, { label: account.naam, href }]}
      />
      <AccountForm
        action={saveAccountAction.bind(null, slug)}
        waarden={metLegeRijen(toFormWaarden(gegevens))}
        orbitNaam={account.orbitNaam}
        terugHref={href}
      />
    </>
  );
}
