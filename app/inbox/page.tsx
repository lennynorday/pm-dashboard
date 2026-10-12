import { connection } from "next/server";
import { Inbox } from "@/components/Inbox";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { currentUser } from "@/lib/session";
import { fetchSlackTodos, SlackNietVerbondenError } from "@/lib/slack/saved";
import { leesTaken, voegSlackToe } from "@/lib/todos";
import grid from "../grid.module.css";
import styles from "./page.module.css";

const HOME = { label: "Overzicht", href: "/" };

type Probleem = { verbinden: true } | { fout: string } | null;

/** Haalt nieuwe bewaarde berichten binnen; de inbox blijft ook zonder Slack zichtbaar. */
async function synchroniseer(email: string): Promise<Probleem> {
  try {
    voegSlackToe(email, await fetchSlackTodos(email));
    return null;
  } catch (error) {
    if (error instanceof SlackNietVerbondenError) return { verbinden: true };
    return { fout: error instanceof Error ? error.message : String(error) };
  }
}

export default async function InboxPage() {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const probleem = await synchroniseer(user.email);
  const taken = leesTaken(user.email, "inbox");

  return (
    <>
      <PageHeading title="Inbox" crumbs={[HOME]} />
      <p className={grid.muted}>
        Wat om jouw aandacht vraagt in Slack. Per bericht kies je: nu reageren,
        naar je to-do&apos;s, of negeren.
      </p>

      {probleem && "verbinden" in probleem && (
        <Melding
          titel="Slack is niet verbonden"
          actie={
            <a href="/api/slack/login" className={styles.melding}>
              Verbinden met Slack
            </a>
          }
        >
          Verbind Slack om je bewaarde berichten hier te zien.
        </Melding>
      )}
      {probleem && "fout" in probleem && (
        <Melding titel="Ophalen uit Slack is mislukt" role="alert">
          {probleem.fout}
        </Melding>
      )}

      <Inbox taken={taken} />
    </>
  );
}
