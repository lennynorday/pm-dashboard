import { Melding } from "./Melding";
import { VerbindLink } from "./VerbindLink";

type Props = {
  jiraKey: string;
  result: { status: "niet-verbonden" } | { status: "fout"; message: string };
};

/** Melding als de tickets van een Jira-project niet beschikbaar zijn. */
export function JiraMessage({ jiraKey, result }: Props) {
  if (result.status === "niet-verbonden") {
    return (
      <Melding
        titel="Niet verbonden met Jira"
        actie={
          <VerbindLink href="/api/jira/login">Verbinden met Jira</VerbindLink>
        }
      >
        Zonder Jira kan het dashboard je tickets niet ophalen. Was je al
        verbonden, dan is de koppeling verlopen of ingetrokken.
      </Melding>
    );
  }
  return (
    <Melding titel={`Tickets van ${jiraKey} ophalen is mislukt`} role="alert">
      {result.message}
    </Melding>
  );
}
