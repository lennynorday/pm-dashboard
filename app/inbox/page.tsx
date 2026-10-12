import { connection } from "next/server";
import { Inbox } from "@/components/Inbox";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { currentUser } from "@/lib/session";
import { synchroniseerSlack } from "@/lib/slack/sync";
import { leesTaken } from "@/lib/todos";
import grid from "../grid.module.css";
import styles from "./page.module.css";

const HOME = { label: "Overzicht", href: "/" };

export default async function InboxPage() {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const probleem = await synchroniseerSlack(user.email);
  const taken = leesTaken(user.email, "inbox");

  return (
    <>
      <PageHeading title="Inbox" crumbs={[HOME]} />
      <p className={grid.muted}>
        Wat om jouw aandacht vraagt in Slack: vermeldingen, DM&apos;s waarop jij
        moet reageren en berichten die je bewaart. Per bericht kies je: nu
        reageren, naar je to-do&apos;s, of negeren.
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
