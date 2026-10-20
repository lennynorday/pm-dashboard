# Lokale MCP voor to-do's en inbox

`2026-10-13` · Lennart ter Haar · Jira [PM-41](https://in10-rotterdam.atlassian.net/browse/PM-41)

## Waarom

- To-do's, de Slack-inbox en wanneer iets is afgerond staan alleen in de database van het dashboard; Claude kan er niet bij.
- Orbit, Jira, Slack en Superhuman hebben al een eigen MCP; wat ontbreekt is de laag die het dashboard zelf toevoegt.
- Ik wil dat Claude meedenkt over mijn openstaande to-do's, meekijkt in de inbox en voor de urenanalyse ziet wat ik op een dag heb afgerond ([PM-40](https://in10-rotterdam.atlassian.net/browse/PM-40)).
- Zonder dit kopieer ik lijsten met de hand naar de chat.

## Scope

- **Wel:** een lokale MCP-server (stdio) die de productiedatabase (`data/dashboard.db`) leest en beperkt beschrijft, voor Claude Desktop en Claude Code.
- **Wel:** lezen van to-do's, inbox en genegeerde items, en afgeronde to-do's per dag.
- **Wel:** schrijven: to-do toevoegen, status of prioriteit wijzigen, inbox-item naar to-do of negeren.
- **Niet:** Orbit, Jira, Slack of Superhuman ontsluiten; daar zijn eigen MCP's voor.
- **Niet:** claude.ai in de browser; die kan localhost niet bereiken.
- **Niet:** staging (`data/staging.db`).
- **Niet:** Slack synchroniseren of berichten versturen.

## Acceptatiecriteria

1. Claude Desktop en Claude Code kunnen de server starten met één configuratieregel uit de README; het dashboard hoeft daarvoor niet te draaien.
2. Tool `taken(lijst)` geeft de inbox, to-do's of genegeerde items met titel, bericht, afzender, plek, status, prioriteit, link en tijdstip.
3. Tool `afgerond_op(datum)` geeft de to-do's die op die dag (Europe/Amsterdam) naar Klaar gingen, met tijdstip.
4. Tool `nieuwe_todo(titel, status?)` maakt een eigen to-do aan; die staat daarna in de kanban.
5. Tools `zet_status(id, status)` en `zet_prio(id, prio)` wijzigen een to-do; naar Klaar zet ook het afrondtijdstip, net als in de app.
6. Tool `verplaats(id, lijst)` zet een inbox-item naar To-do's of Genegeerd.
7. Schrijftools gebruiken dezelfde functies als de app; er is geen tweede versie van de logica.
8. Schrijven terwijl productie draait geeft geen "database is locked"-fout bij normaal gebruik.
9. Ongeldige invoer (onbekend id, status of lijst) geeft een duidelijke foutmelding en wijzigt niets.

## Domeinmodel

- **Taak:** een item uit Slack, de feed of eigen invoer, in één van drie lijsten: inbox, to-do's, genegeerd.
- **Status** (alleen to-do's): niet gestart, bezig, wacht, klaar, geblokkeerd; **afgerond** is het moment dat een taak op klaar ging.

## Besluiten

- Schrijftools vragen per keer toestemming in Claude Desktop en Code; dat is genoeg.
- De server draait met `tsx` (dev-dependency), zodat hij dezelfde TypeScript-functies als de app gebruikt.
