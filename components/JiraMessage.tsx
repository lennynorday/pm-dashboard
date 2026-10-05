import { Melding } from "./Melding";

type Props = {
  jiraKey: string;
  result: { status: "niet-ingesteld" } | { status: "fout"; message: string };
};

/** Melding als de tickets van een Jira-project niet beschikbaar zijn. */
export function JiraMessage({ jiraKey, result }: Props) {
  if (result.status === "niet-ingesteld") {
    return (
      <Melding titel="Jira is nog niet ingesteld">
        Zet het Jira-token in .env.local.
      </Melding>
    );
  }
  return (
    <Melding titel={`Tickets van ${jiraKey} ophalen is mislukt`} role="alert">
      {result.message}
    </Melding>
  );
}
