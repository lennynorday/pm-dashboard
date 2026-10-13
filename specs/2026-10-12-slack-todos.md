# Slack To-do's op het dashboard

`2026-10-12` · Lennart ter Haar · TODO Jira-ticket

## Waarom

- Lennart bewaart berichten in Slack als To-do (Later) en wil die lijst op het dashboard zien, naast de rest van zijn werk.
- Slack heeft geen API voor Later. Het enige officiële pad is zoeken op `is:saved` met een gebruikerstoken, dus alleen bewaarde berichten (geen herinneringen of follow-ups).

## Scope

- **Wel:** een pagina "To-do's" onder Overzicht in het zijmenu, met je bewaarde Slack-berichten: tekst, auteur, kanaal, tijdstip en een link naar het bericht in Slack.
- **Wel:** per gebruiker verbinden met Slack via OAuth (gebruikerstoken, scope `search:read`), net als Jira en Orbit, met een regel op Instellingen.
- **Niet:** afvinken, archiveren of een deadline zetten; dat kan Slack niet via een officiële API. Je doet dat in Slack.
- **Niet:** eigen to-do's in het dashboard. Die komen later op dezelfde pagina; Slack is daarbij één bron naast andere (2026-10-12, Lenny).
- **Niet:** herinneringen en follow-ups uit Later.
- **Niet:** een melding in Mijn feed.

## Acceptatiecriteria

1. Zonder Slack-koppeling toont de pagina een knop "Verbind met Slack"; na verbinden staat de lijst er.
2. De lijst toont precies de berichten die `is:saved` teruggeeft, nieuwste eerst.
3. Elke regel linkt naar het bericht in Slack (permalink).
4. Een bericht dat je in Slack niet meer bewaart, verdwijnt na verversen van de lijst.
5. Een verlopen of ingetrokken token toont "Opnieuw verbinden", geen foutpagina.
6. Slack staat op Instellingen bij de koppelingen, met ontkoppelen.
7. Het token staat versleuteld opgeslagen, zoals dat van Jira.

## Besluiten

- `is:saved` met een gebruikerstoken (`search:read`) geeft de bewaarde berichten terug; getest op 2026-10-12. Slack heeft eerder bewaarde berichten omgezet naar To-do's, dus alleen wat daar nog als bewaard staat, komt mee.
- Alleen lezen: afronden doe je in Slack. Slack biedt daar geen officiële API voor (2026-10-12, Lenny).
- Opgevolgd door [inbox-en-todos](2026-10-12-inbox-en-todos.md): de pagina To-do's is daar een eigen lijst met kanban geworden en de bewaarde berichten komen binnen via de Inbox.
