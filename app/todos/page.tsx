import { connection } from "next/server";
import { ExternalLink } from "@/components/ExternalLink";
import { Melding } from "@/components/Melding";
import { PageHeading } from "@/components/PageHeading";
import { currentUser } from "@/lib/session";
import {
  fetchSlackTodos,
  SlackNietVerbondenError,
  SlackTodo,
} from "@/lib/slack/saved";
import grid from "../grid.module.css";
import styles from "./page.module.css";

const HOME = { label: "Overzicht", href: "/" };

const tijdFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function laadSlack(
  email: string,
): Promise<{ todos: SlackTodo[] } | { fout: string } | { verbinden: true }> {
  try {
    return { todos: await fetchSlackTodos(email) };
  } catch (error) {
    if (error instanceof SlackNietVerbondenError) return { verbinden: true };
    return { fout: error instanceof Error ? error.message : String(error) };
  }
}

export default async function TodosPage() {
  await connection();
  // De layout toont het inlogscherm zonder sessie; hier is er dus altijd een.
  const user = await currentUser();
  if (!user) return null;
  const slack = await laadSlack(user.email);

  return (
    <>
      <PageHeading title="To-do's" crumbs={[HOME]} />

      <section className={grid.section} aria-labelledby="slack">
        <h2 id="slack" className={grid.sectionTitle}>
          Slack
        </h2>
        {"verbinden" in slack && (
          <Melding
            titel="Slack is niet verbonden"
            actie={
              <a href="/api/slack/login" className={styles.knop}>
                Verbinden met Slack
              </a>
            }
          >
            Verbind Slack om je bewaarde berichten hier te zien.
          </Melding>
        )}
        {"fout" in slack && (
          <Melding titel="Ophalen uit Slack is mislukt" role="alert">
            {slack.fout}
          </Melding>
        )}
        {"todos" in slack && (
          <>
            <p className={grid.muted}>
              Je bewaarde berichten. Afronden doe je in Slack.
            </p>
            {slack.todos.length === 0 ? (
              <p className={grid.muted}>Je hebt geen bewaarde berichten.</p>
            ) : (
              <ul className={styles.lijst}>
                {slack.todos.map((todo) => (
                  <li key={todo.permalink} className={styles.todo}>
                    <p className={styles.meta}>
                      {todo.auteur} · {todo.kanaal} ·{" "}
                      {tijdFormat.format(new Date(todo.tijd * 1000))}
                    </p>
                    <p className={styles.tekst}>{todo.text}</p>
                    <ExternalLink href={todo.permalink} className={styles.link}>
                      Openen in Slack
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
