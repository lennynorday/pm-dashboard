import { Melding } from "./Melding";

type Props = {
  result: { status: "niet-ingesteld" } | { status: "fout"; message: string };
};

/** Melding in een Jira-blok als de data niet beschikbaar is. */
export function JiraMessage({ result }: Props) {
  if (result.status === "niet-ingesteld") {
    return (
      <Melding titel="Jira is nog niet ingesteld">
        Zet het token in .env.local.
      </Melding>
    );
  }
  return (
    <Melding titel="Ophalen uit Jira is mislukt" role="alert">
      {result.message}
    </Melding>
  );
}
