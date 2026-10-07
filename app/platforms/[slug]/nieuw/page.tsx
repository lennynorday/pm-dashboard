import { PlatformFormulier } from "@/components/PlatformFormulier";

export default async function PlatformToevoegenPage({
  params,
}: PageProps<"/platforms/[slug]/nieuw">) {
  const { slug } = await params;
  return <PlatformFormulier slug={slug} nieuw />;
}
