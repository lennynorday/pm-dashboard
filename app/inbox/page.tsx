import { connection } from "next/server";
import { verplaatsTaakAction } from "@/app/actions";
import { ExternalLink } from "@/components/ExternalLink";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { currentUser } from "@/lib/session";
import { fetchSlackTodos, SlackNietVerbondenError } from "@/lib/slack/saved";
import { leesTaken, voegSlackToe } from "@/lib/todos";
import grid from "../grid.module.css";
import styles from "./page.module.css";

const HOME = { label: "Overzicht", href: "/" };

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

      <section className={styles.paneel} aria-label="Inbox">
        {taken.length === 0 ? (
          <p className={styles.leeg}>Inbox leeg.</p>
        ) : (
          <ul className={styles.lijst}>
            {taken.map((taak) => (
              <li key={taak.id} className={styles.item}>
                <div className={styles.body}>
                  <p className={styles.meta}>
                    <span className={styles.bron}>Slack</span>
                    {taak.auteur && <span>{taak.auteur}</span>}
                    {taak.plek && <span>{taak.plek}</span>}
                    {taak.tijd !== null && (
                      <span>
                        {tijdFormat.format(new Date(taak.tijd * 1000))}
                      </span>
                    )}
                    {taak.soort && <span>{taak.soort}</span>}
                  </p>
                  <p className={styles.titel}>{taak.titel}</p>
                </div>
                <div className={styles.acties}>
                  {taak.url && (
                    <ExternalLink href={taak.url} className={styles.open}>
                      Openen in Slack
                    </ExternalLink>
                  )}
                  <form
                    action={verplaatsTaakAction.bind(null, taak.id, "todo")}
                  >
                    <button type="submit" className={styles.todo}>
                      <PlusIcon className={styles.icoon} />
                      Naar to-do
                    </button>
                  </form>
                  <form
                    action={verplaatsTaakAction.bind(
                      null,
                      taak.id,
                      "genegeerd",
                    )}
                  >
                    <button type="submit" className={styles.negeer}>
                      <CloseIcon className={styles.icoon} aria-hidden="true" />
                      <span className="visually-hidden">
                        Negeren: {taak.titel}
                      </span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
