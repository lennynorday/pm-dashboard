# Updates op To-do's

`2026-10-15` · Lennart ter Haar · Jira [PM-51](https://in10-rotterdam.atlassian.net/browse/PM-51)

## Waarom

- Een mail- of Slack-gesprek dat op To-do's staat, wordt bij een nieuwe reactie niet bijgewerkt ([gmail-in-inbox](2026-10-13-gmail-in-inbox.md) criterium 8, [inbox-vervolg](2026-10-13-inbox-vervolg.md)). Een to-do op "Wacht / review" krijgt antwoord en het dashboard laat dat nergens zien.
- Ik wil op één plek zien op welke to-do's iets nieuws is gebeurd, zonder dat die to-do terug naar de Inbox gaat.

## Scope

- **Wel:** een nieuwe reactie in een Gmail-gesprek of Slack-DM dat op To-do's staat, verschijnt in een blok "Updates op je to-do's" onder de Inbox, en als markering op de kaart bij To-do's.
- **Niet:** bewaarde Slack-berichten en vermeldingen. Dat zijn losse berichten zonder gesprek, dus er komt geen reactie op binnen.
- **Niet:** reacties op to-do's die op Klaar staan.
- **Niet:** de to-do terugzetten naar de Inbox of de status aanpassen.

## Acceptatiecriteria

1. Komt er in een gesprek dat op To-do's staat (status niet Klaar) een nieuwe mail of DM van iemand anders, dan staat die to-do na de volgende synchronisatie onder "Updates op je to-do's" op de Inbox-pagina, onder de nieuwe Inbox-items.
2. Een update toont de bron, de status van de to-do, de afzender, de tijd, de eigen titel van de to-do, de eerste ±200 tekens van de nieuwe reactie en een link naar het gesprek.
3. De eigen titel van de to-do blijft staan. Lijst, status, prio en volgorde veranderen niet.
4. Op To-do's heeft de kaart een markering "Nieuwe reactie van <afzender>" met de tekst van de reactie.
5. De knop "Gezien" (bij de update en op de kaart) haalt de markering weg. De to-do blijft staan. Ongedaan maken kan via de melding.
6. Een eigen antwoord in het gesprek geeft geen update.
7. Komt er daarna nog een reactie, dan verschijnt de update opnieuw.
8. Updates tellen mee in het getal bij Inbox in het menu.
9. Staat er geen update, dan is het blok er niet.

## Domeinmodel

- **Reactie:** kolom `reactie` op `taken`, het tijdstip (Unix-seconden) van de nieuwste reactie die je nog niet hebt gezien. `null` = niets nieuws.

## Aanpak

- De sync ziet de nieuwe reactie al: het gesprek komt opnieuw binnen met een latere `tijd`. Nu gooit `ON CONFLICT ... WHERE taken.lijst != 'todo'` die weg. Een aparte `UPDATE` voor to-do's zet `bericht`, `auteur`, `afzender`, `tijd`, `url` en `reactie` als `tijd` nieuwer is en de status niet Klaar is.
- Gmail en Slack leveren alleen gesprekken waarvan de laatste mail of DM niet van jou is. Een eigen antwoord geeft dus geen update.
- Mockup: `public/mockups/todo-updates.html` (nieuw boven, updates onder).

## Open vragen

- Geen.
