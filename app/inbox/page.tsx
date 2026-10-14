import { connection } from "next/server";
import { Inbox } from "@/components/Inbox";
import { InboxVerversen } from "@/components/InboxVerversen";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { currentUser } from "@/lib/session";
import { synchroniseerGmail } from "@/lib/gmail/sync";
import { bronAan } from "@/lib/inbox-bronnen";
import { synchroniseerSlack } from "@/lib/slack/sync";
import { leesTaken } from "@/lib/todos";
import grid from "../grid.module.css";
import styles from "./page.module.css";
import { VerbindLink } from "@/components/VerbindLink";

const HOME = { label: "Overzicht", href: "/" };

export default async function InboxPage() {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const [probleem, gmail] = await Promise.all([
    bronAan(user.email, "slack") ? synchroniseerSlack(user.email) : null,
    bronAan(user.email, "gmail") ? synchroniseerGmail(user.email) : null,
  ]);
  const taken = leesTaken(user.email, "inbox");

  return (
    <>
      <PageHeading title="Inbox" crumbs={[HOME]} />
      <p className={grid.muted}>
        Wat om jouw aandacht vraagt in Slack en Gmail. Per bericht kies je: nu
        reageren, naar je to-do&apos;s, of negeren.
      </p>
      <InboxVerversen />

      {probleem && "verbinden" in probleem && (
        <Melding
          titel="Slack is niet verbonden"
          actie={
            <VerbindLink href="/api/slack/login" className={styles.melding}>
              Verbinden met Slack
            </VerbindLink>
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

      {gmail && "fout" in gmail && (
        <Melding titel="Ophalen uit Gmail is mislukt" role="alert">
          {gmail.fout}
        </Melding>
      )}

      <Inbox taken={taken} />
    </>
  );
}
