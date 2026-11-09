import { connection } from "next/server";
import { Actiepunten, type Wie } from "@/components/Actiepunten";
import { PageHeading } from "@/components/PageHeading";
import { haalActiesUit, leesFeed } from "@/lib/actiepunten";
import { currentUser } from "@/lib/session";

const HOME = { label: "Overzicht", href: "/" };

const parseWie = (waarde: unknown): Wie =>
  waarde === "collega" || waarde === "alles" ? waarde : "mij";
const tekst = (waarde: unknown) =>
  typeof waarde === "string" && waarde ? waarde : null;

/** Acties uit de notulen: die van jou naar je to-do's, die van collega's volgen en herinneren. */
export default async function ActiepuntenPage({
  searchParams,
}: PageProps<"/actiepunten">) {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const params = await searchParams;
  const herinner = Number(params.herinner);
  // Notulen die nog niet uitgelezen zijn, staan er zo meteen in.
  haalActiesUit(user.email);

  return (
    <>
      <PageHeading title="Actiepunten" crumbs={[HOME]} />
      <Actiepunten
        acties={leesFeed(user.email, user.voornaam)}
        filters={{
          wie: parseWie(params.wie),
          persoon: tekst(params.persoon),
          platform: tekst(params.platform),
        }}
        herinner={Number.isInteger(herinner) && herinner > 0 ? herinner : null}
      />
    </>
  );
}
