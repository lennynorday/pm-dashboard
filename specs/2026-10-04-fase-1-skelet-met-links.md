# Fase 1: skelet met links

`2026-10-04` · Lennart ter Haar · fase 1 uit `BRIEFING.md`

## Waarom

- Ik wil per account en project op één plek alle links hebben die ik dagelijks nodig heb, in plaats van ze in Slack, Superhuman en bladwijzers te zoeken.
- Dit skelet is de basis waar fase 2 (Jira) en fase 3 (Orbit-cijfers) in vallen.
- Accounts en projecten komen uit Orbit, zodat ik ze niet hoef over te typen en nieuwe projecten vanzelf verschijnen.

## Scope

- **Wel:** homepage, accountpagina, projectpagina; open projecten op mijn naam uit Orbit (`ListProjects`), gegroepeerd per klant; getypeerde config `config/accounts.ts` met AM, contactpersonen, Jira-key en links; projecten verbergen en terugzetten vanuit de app; cache van 15 minuten met knop "Verversen" en tijdstip van ophalen; Norday-huisstijl, licht en donker, smal scherm.
- **Niet:** budget- en urencijfers (fase 3), Jira-aantallen (fase 2), to-do's en signalen (fase 4), een bewerkscherm voor de config, handmatige accounts of projecten buiten Orbit.

## Acceptatiecriteria

1. De homepage toont alle open Orbit-projecten waar ik eigenaar van ben, gegroepeerd per account (de Orbit-klant), in orde van budget - groot naar klein. SLA projecten zijn een aparte categorie, die alfabetisch geordend zijn. De budgetstatus wordt per project aangegeven.
2. De homepage heeft snelkoppelingen naar mijn Gmail-inbox en mijn to-do-pagina in Superhuman.
3. Elk account en elk project op de homepage is een link naar de eigen pagina; vanaf home bereik ik elk project in maximaal twee klikken.
4. De accountpagina toont naam, AM, contactpersonen, de projecten van het account en de account-links.
5. De projectpagina toont naam, projectnummer, status, einddatum, een link naar het project in Orbit, de Jira-key met link naar het board (als die is ingesteld) en de project-links.
6. Links zijn gegroepeerd per type (Superhuman, Slack, Jira, Drive, offerte, omgeving, overig); elke link opent in een nieuw tabblad en zegt dat ook voor screenreaders.
7. Een Slack- of Superhuman-link is van het type intern, tenzij "gedeeld" in de titel staat.
8. Ik kan een project verbergen en op dezelfde manier terugzetten; verborgen projecten staan onderaan in een ingeklapte lijst "Verborgen projecten". De keuze blijft bewaard na herstarten van de app.
9. Elke pagina met Orbit-data toont wanneer die is opgehaald; "Verversen" haalt de lijst opnieuw op, en anders blijft de lijst 15 minuten in de cache.
10. Is Orbit niet bereikbaar of niet ingelogd, dan toont de pagina een duidelijke melding met een knop "Inloggen bij Orbit", en de config-links blijven werken.
11. Alle UI-tekst is Nederlands zonder em-dashes; alle kleuren en maten komen uit de tokens; status is nooit alleen kleur.
12. De pagina's zijn volledig met het toetsenbord te bedienen en de lay-out werkt vanaf 320px breed.

## Domeinmodel

- **Account:** een Orbit-klant, met naam, AM, contactpersonen, links en projecten.
- **Project:** een Orbit-project van één account, met nummer, intern id, status, einddatum, Jira-key(s), links en een zichtbaarheid (`zichtbaar` of `verborgen`).
- **Link:** type (enum uit de briefing), label en url.
- **Verborgen projecten:** lokaal bewaard in `data/` (niet in Git), los van de config.
