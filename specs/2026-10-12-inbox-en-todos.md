# Inbox en to-do's

`2026-10-12` · Lennart ter Haar · TODO Jira-ticket

## Waarom

- Lennart wil Slack-berichten snel op een eigen to-do-lijst in het dashboard zetten. Slack heeft daar geen API voor, dus het dashboard haalt de bewaarde berichten op in een inbox, waar hij per bericht kiest.
- De lijst moet kunnen groeien met eigen taken en andere bronnen (Gmail, later). Daarom één model voor alles wat binnenkomt en alles wat een taak is.

## Scope

- **Wel:** pagina Inbox (menu, met teller) met wat in Slack om aandacht vraagt: je vermeldingen, DM's en groeps-DM's waarvan het laatste bericht niet van jou is (één item per gesprek), en je bewaarde berichten. Per bericht Openen in Slack, Naar to-do of Negeren.
- **Wel:** alleen wat binnenkomt vanaf de eerste synchronisatie (vermeldingen en DM's); geen terugwerkende kracht. Bewaarde berichten komen wel allemaal mee.
- **Wel:** synchroniseren bij het openen van de Inbox en elke 5 minuten zolang het dashboard openstaat.
- **Wel:** Naar to-do opent een popup waarin je de taak zelf uitschrijft (die tekst wordt de titel) en een prioriteit kiest; het bericht blijft zichtbaar en de taak linkt ernaar terug. Het item vervaagt uit de lijst en een melding onderin bevestigt het, met Ongedaan maken.
- **Wel:** dezelfde Naar to-do-keuze op elke melding in Mijn feed op Overzicht; de melding verdwijnt dan uit de feed en komt met Ongedaan maken terug.
- **Wel:** de titel van elke taak is te bewerken (⋯ → Titel bewerken).
- **Wel:** pagina To-do's met Kanban en Lijst. Statussen Niet gestart, Bezig, Wacht / review, Klaar, Geblokkeerd; prioriteit 1 Urgent t/m 4 Laag (standaard 3 Middel); eigen taken toevoegen; zoeken; status en prioriteit wijzigen; slepen tussen kolommen.
- **Wel:** Klaar verdwijnt uit de kanban en staat in een uitklapper onderaan de lijst.
- **Niet:** Gmail (volgende stap), thread-antwoorden (te veel ruis), kanaalberichten, deadlines, uitvoerders, subtaken, volgorde binnen een kolom, direct antwoorden vanuit het dashboard.
- **Niet:** de bestaande Superhuman-kanban overnemen of synchroniseren. De lijst staat lokaal in het dashboard (2026-10-12, Lenny).

## Acceptatiecriteria

1. Een bewaard Slack-bericht verschijnt na openen van Inbox als nieuw item, één keer, ook na herhaald verversen.
2. Naar to-do opent de popup; zonder titel geeft Opslaan een foutmelding. Met titel staat het op To-do's met status Niet gestart en de gekozen prioriteit, met de eigen titel, een link naar het bericht en de bronnaam; Negeren verbergt het en het komt niet terug bij verversen.
3. Op To-do's wisselen Kanban en Lijst; de keuze blijft bewaard.
4. Een kaart slepen naar een andere kolom wijzigt de status; het ⋯-menu en het statuslabel doen hetzelfde zonder slepen.
5. Een taak op Klaar staat niet meer op de kanban en wel in de uitklapper Klaar onder de lijst; ongedaan maken kan.
6. Eigen taken toevoegen en zoeken werkt; zoeken filtert beide weergaven.
7. De tellers in het menu tonen nieuwe inbox-items en open taken (niet Klaar).
8. Alles is toetsenbordbedienbaar en status staat nooit alleen als kleur.

## Domeinmodel

Eén taak met `lijst` (inbox, todo, genegeerd), `status` en `prio`. Een inbox-item is een taak die nog niet gekozen is; Naar to-do wijzigt alleen de lijst. Een item blijft bestaan als het uit de bron verdwijnt. 9. Naar to-do op een melding in Mijn feed zet een taak (bron Feed, titel voorgevuld) en haalt de melding uit de feed; Ongedaan maken zet hem terug en verwijdert de taak. 10. De eerste synchronisatie haalt geen vermeldingen of DM's uit het verleden binnen; een vermelding of DM die daarna binnenkomt staat bij de volgende synchronisatie in de Inbox. 11. Een DM-gesprek waarin jij het laatste bericht stuurde, staat niet in de Inbox.
