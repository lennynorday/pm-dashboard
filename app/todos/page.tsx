import { cookies } from "next/headers";
import { connection } from "next/server";
import { PageHeading } from "@/components/PageHeading";
import { Todos } from "@/components/Todos";
import {
  parseSortering,
  parseWeergave,
  SORTERING_COOKIE,
  TODOS_COOKIE,
} from "@/components/TodosWeergave";
import { currentUser } from "@/lib/session";
import { leesTaken } from "@/lib/todos";

const HOME = { label: "Overzicht", href: "/" };

export default async function TodosPage() {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const cookieStore = await cookies();

  return (
    <>
      <PageHeading title="To-do's" crumbs={[HOME]} />
      <Todos
        taken={leesTaken(user.email, "todo")}
        weergave={parseWeergave(cookieStore.get(TODOS_COOKIE)?.value)}
        sortering={parseSortering(cookieStore.get(SORTERING_COOKIE)?.value)}
      />
    </>
  );
}
