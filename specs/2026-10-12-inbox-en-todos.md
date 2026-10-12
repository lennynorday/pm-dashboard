# Inbox en to-do's

`2026-10-12` · Lennart ter Haar · TODO Jira-ticket

## Waarom

- Lennart wil Slack-berichten snel op een eigen to-do-lijst in het dashboard zetten. Slack heeft daar geen API voor, dus het dashboard haalt de bewaarde berichten op in een inbox, waar hij per bericht kiest.
- De lijst moet kunnen groeien met eigen taken en andere bronnen (Gmail, later). Daarom één model voor alles wat binnenkomt en alles wat een taak is.

## Scope

- **Wel:** pagina Inbox (menu, met teller): bewaarde Slack-berichten, per bericht Openen in Slack, Naar to-do of Negeren.
- **Wel:** pagina To-do's met Kanban en Lijst. Statussen Niet gestart, Bezig, Wacht / review, Klaar, Geblokkeerd; prioriteit 1 Urgent t/m 4 Laag (standaard 3 Middel); eigen taken toevoegen; zoeken; status en prioriteit wijzigen; slepen tussen kolommen.
- **Wel:** Klaar verdwijnt uit de kanban en staat in een uitklapper onderaan de lijst.
- **Niet:** Gmail (volgende stap), deadlines, uitvoerders, subtaken, volgorde binnen een kolom, direct antwoorden vanuit het dashboard.
- **Niet:** de bestaande Superhuman-kanban overnemen of synchroniseren. De lijst staat lokaal in het dashboard (2026-10-12, Lenny).

## Acceptatiecriteria

1. Een bewaard Slack-bericht verschijnt na openen van Inbox als nieuw item, één keer, ook na herhaald verversen.
2. Naar to-do zet het op To-do's met status Niet gestart en prioriteit Middel; Negeren verbergt het en het komt niet terug bij verversen.
3. Op To-do's wisselen Kanban en Lijst; de keuze blijft bewaard.
4. Een kaart slepen naar een andere kolom wijzigt de status; het ⋯-menu en het statuslabel doen hetzelfde zonder slepen.
5. Een taak op Klaar staat niet meer op de kanban en wel in de uitklapper Klaar onder de lijst; ongedaan maken kan.
6. Eigen taken toevoegen en zoeken werkt; zoeken filtert beide weergaven.
7. De tellers in het menu tonen nieuwe inbox-items en open taken (niet Klaar).
8. Alles is toetsenbordbedienbaar en status staat nooit alleen als kleur.

## Domeinmodel

Eén taak met `lijst` (inbox, todo, genegeerd), `status` en `prio`. Een inbox-item is een taak die nog niet gekozen is; Naar to-do wijzigt alleen de lijst. Een item blijft bestaan als het uit de bron verdwijnt.
