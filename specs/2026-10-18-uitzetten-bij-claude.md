# Uitzetten bij Claude

`2026-10-18` · Lennart ter Haar · TODO Jira-ticket

## Waarom

- Veel to-do's in het dashboard zijn een reactie op een mail of Slack-gesprek. Het schrijven van een eerste versie kost tijd, terwijl de context al in het dashboard staat.
- Ik wil een to-do met één klik bij Claude kunnen uitzetten. Claude maakt een concept, ik beoordeel het. Zo blijf ik signaleren en beleggen, en doet Claude het schrijfwerk.
- Het dashboard heeft de context al (to-do, bericht, gesprek). Claude hoeft die niet opnieuw op te halen via connectors; dat scheelt tokens.

## Scope

- **Wel:** een knop "Uitzetten bij Claude" op elke open to-do (kanban en lijst, ook in het ⋯-menu). Die opent een popup met een optioneel veld "Wat moet Claude doen?". Leeg = Claude kiest zelf.
- **Wel:** het dashboard start lokaal Claude Code (`claude -p`) op de achtergrond, met de to-do, de tekst van het gesprek en de instructie als input.
- **Wel:** drie soorten uitkomst: Gmail-concept, Slack-concept en advies (alleen tekst: wat Claude zou doen en waarom).
- **Wel:** het resultaat staat bij de to-do in een blok "Voorstel van Claude". De to-do gaat naar Wacht / review.
- **Wel:** drie knoppen bij het voorstel: Akkoord (concept klaarzetten in de bron), Aanpassen (feedback geven, nieuwe versie) en Afwijzen (voorstel weg, to-do terug naar de vorige status).
- **Wel:** elke opdracht wordt bewaard (soort, instructie, uitkomst, akkoord of afgewezen), zodat we later kunnen zien wat goed werkt.
- **Niet:** iets versturen. Claude maakt altijd een concept; versturen doe ik zelf in Gmail of Slack. Dit is een harde regel.
- **Niet:** Jira-tickets, Orbit-acties of reacties op supporttickets. Die zijn direct zichtbaar voor anderen. Supporttickets in de Inbox: [PM-56](https://in10-rotterdam.atlassian.net/browse/PM-56).
- **Niet:** proactieve suggesties of automatische concepten. Claude start alleen als ik op de knop druk. Automatiseren bekijken we later, op basis van de bewaarde opdrachten.
- **Niet:** draaien in de cloud. Alles blijft op mijn Mac, net als het dashboard.

## Acceptatiecriteria

1. Op een open to-do staat "Uitzetten bij Claude". Op een to-do op Klaar niet.
2. De knop opent een popup met een optioneel instructieveld en de knoppen Uitzetten en Annuleren. Toetsenbord en schermlezer werken (WCAG 2.2 AA).
3. Na Uitzetten toont de kaart "Claude is bezig" (tekst en icoon, niet alleen kleur). Het dashboard blijft bruikbaar terwijl Claude werkt.
4. Is Claude klaar, dan staat het voorstel bij de to-do, gaat de to-do naar Wacht / review en verschijnt een melding onderin.
5. Een Gmail- of Slack-concept toont ontvanger, onderwerp (bij mail) en tekst. Een advies toont alleen tekst.
6. Akkoord bij een Gmail-concept zet een concept-antwoord in hetzelfde Gmail-gesprek. Er wordt niets verstuurd. De link "Openen in Gmail" gaat naar dat concept.
7. Akkoord bij een Slack-concept kopieert de tekst naar het klembord en opent het gesprek in Slack. Er wordt niets verstuurd.
8. Aanpassen opent een veld voor feedback. Claude maakt een nieuwe versie met de vorige versie en de feedback als input. De vorige versie blijft bewaard.
9. Afwijzen haalt het voorstel weg en zet de to-do terug op de status van voor het uitzetten. Ongedaan maken kan via de melding.
10. Mislukt een run (Claude Code niet gevonden, time-out na 3 minuten, fout), dan toont de kaart een duidelijke melding met Opnieuw proberen. De to-do verandert niet van status.
11. Claude krijgt in de run geen tool die iets verstuurt of publiceert. Ook niet als de instructie daarom vraagt.
12. Per opdracht staan in de database: to-do, soort, instructie, versies, uitkomst (akkoord, afgewezen, mislukt) en tijden.

## Domeinmodel

- **Opdracht:** nieuwe tabel `opdrachten`. Een opdracht hoort bij één taak en heeft een `instructie` (kan leeg), een `status` (bezig, voorstel, akkoord, afgewezen, mislukt), een `soort` (gmail-concept, slack-concept, advies), `vorige_status` van de taak, `gestart` en `klaar`.
- **Versie:** een opdracht heeft één of meer versies (tabel `opdracht_versies`): `ontvanger`, `onderwerp`, `tekst`, `feedback` (de feedback die tot deze versie leidde) en `aangemaakt`.
- Een taak heeft hoogstens één opdracht die niet akkoord of afgewezen is.

## Aanpak

- Server action start `claude -p` met `child_process.spawn`, buiten de request om. De uitkomst komt terug als JSON (`--output-format json`) en wordt geparset aan de grens naar een `Voorstel`.
- Slank draaien om tokens te sparen: `--model sonnet`, een lege werkmap (niet de repo, zodat `CLAUDE.md` en specs niet meeladen), `--strict-mcp-config` zonder MCP's, en een vaste prompt die om één JSON-object vraagt.
- Het dashboard levert de context zelf aan: titel, bron, afzender, de tekst van het gesprek (bij Gmail de laatste mails van de thread via de bestaande Gmail-koppeling) en de instructie.
- Akkoord bij Gmail doet het dashboard zelf via de Gmail API (`drafts.create` met `threadId`). Daarvoor is de scope `gmail.compose` nodig. Zo verloopt het klaarzetten zonder Claude en zonder tokens.
- Mockup eerst in `public/mockups/uitzetten-bij-claude.html`.

## Besluiten

- **Geen skills in de run.** De prompt bevat zelf de schrijfregels (Nederlands, toon, geen gedachtestreepjes). De skill code-switch voegen we pas toe als de toon niet goed is; hij kost meer tokens per run (2026-10-18, Lenny).
- **Slack-concept: Kopiëren plus Openen in Slack.** Slack heeft geen officiële API voor concepten met een gebruikerstoken. Akkoord bij een Slack-concept kopieert de tekst en opent het gesprek in Slack (2026-10-18, Lenny).
- **Gmail-scope `gmail.compose` erbij.** Daarvoor verbind ik één keer opnieuw met Google (2026-10-18, Lenny).

## Open vragen

- Geen.
