# Demomodus met nepdata

`2026-10-16` · Lennart ter Haar · TODO: Jira-ticket in PM

## Waarom

- Doorontwikkelen op een vrije dag toont nu echte projecten, to-do's, collega's en klanten.
- Dat trekt je terug in je werk, terwijl je alleen aan het dashboard wilt bouwen.
- Een demomodus met verzonnen maar realistische data maakt bouwen mogelijk zonder echte gegevens te zien.
- Bijkomend voordeel: schermafbeeldingen en demo's bevatten geen klantgegevens.

## Scope

- **Wel:** `npm run demo` start de dev-server op poort 3000 met `DEMO=1` en een eigen `data/demo.db`.
- **Wel:** in demomodus komt alle data uit vaste nepdata: dashboard, budgetten, sprints, SLA/Overige, Jira, accountgegevens, inbox en to-do's.
- **Wel:** de nepwereld zit in dezelfde branche (culturele instellingen, overheid, corporaties), met verzonnen namen voor klanten, platforms, collega's en contactpersonen.
- **Wel:** inbox en to-do's staan in `demo.db`, zodat slepen, afvinken en prio's gewoon werken.
- **Niet:** demomodus op productie (3999) of op de gewone `npm run dev`.
- **Niet:** nepdata die vanzelf verandert in de tijd. Datums staan wel relatief ten opzichte van vandaag.

## Acceptatiecriteria

1. `npm run demo` start op localhost:3000 zonder dat er inlog- of koppelstappen nodig zijn. Je bent automatisch ingelogd als een verzonnen gebruiker.
2. In demomodus gaat er geen verzoek naar Orbit, Jira, Slack, Gmail, Google of Superhuman (te controleren in de serverlog en de netwerkverzoeken).
3. Op geen enkele pagina staat een echte klant-, project-, collega- of contactnaam. De nepdata bevat ook geen echte Orbit-, Jira- of Superhuman-id's of -URL's.
4. Het overzicht toont 6–8 klanten met platforms, met daarin minstens één budget dat bijna op is, één overschreden budget, één SLA in het rood en één lopende sprint.
5. De inbox toont ~15 items uit Slack en Gmail (vermeldingen, DM-gesprekken, mails). Het kanban toont ~10 to-do's verdeeld over de kolommen.
6. Wijzigingen in demomodus komen alleen in `demo.db` terecht. `staging.db` en `dashboard.db` blijven ongewijzigd.
7. Na het verwijderen van `demo.db` start de demo weer met de oorspronkelijke nepdata.
8. Zonder `DEMO=1` werkt alles precies zoals nu.
