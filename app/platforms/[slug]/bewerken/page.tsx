import { PlatformFormulier } from "@/components/PlatformFormulier";

export default async function PlatformBewerkenPage({
  params,
}: PageProps<"/platforms/[slug]/bewerken">) {
  const { slug } = await params;
  return <PlatformFormulier slug={slug} nieuw={false} />;
}
