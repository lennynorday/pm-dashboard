# Favorieten op het overzicht

`2026-10-14` · Lennart ter Haar · Jira [PM-31](https://in10-rotterdam.atlassian.net/browse/PM-31)

## Waarom

- Van een groot project kijk ik eigenlijk maar naar één map of één regel, bijvoorbeeld Change management in een SLA. Daarvoor moet ik elke keer het project openklappen.
- Met een ster zet ik die cijfers bovenaan het overzicht.

## Scope

- **Wel:** een sterknop bij elke map en elke regel in een uitgeklapt project.
- **Wel:** een blok Favorieten bovenaan het overzicht, boven de platformkaarten, met dezelfde cijfers en balk als de projectregels, plus het resterende aantal uren.
- **Wel:** favorieten per gebruiker bewaren, op het Orbit-id van de map of regel.
- **Niet:** een eigen volgorde of groepering van favorieten.
- **Niet:** extra Orbit-aanroepen. Favorieten komen uit de budgetten die het overzicht al laadt.

## Acceptatiecriteria

1. Elke map en regel heeft een knop met `aria-pressed`: "Markeer als favoriet: <naam>" of "Favoriet: <naam>". Een ster zonder markering is subtiel tot je over de rij gaat of er focus op staat.
2. Het blok Favorieten staat boven de platformkaarten. Zonder favorieten is het blok verborgen.
3. Een rij toont op de eerste regel de projectnaam (vet) en op de tweede de naam van de map of regel, met een label Map of Regel (bij een regel "in <mapnaam>").
4. Een favoriete map toont het totaal van de map, niet de regels erin.
5. De cijfers zijn verbruikt %, geschreven, beschikbaar en resterend, uit de Orbit-getallen. Een negatief resterend is in de waarschuwingskleur.
6. De projectnaam springt naar dat project op het overzicht.
7. De ster staat ook in het blok Favorieten en haalt de favoriet weer weg.
8. Een favoriet waarvan het project nu niet zichtbaar of geladen is, wordt niet getoond.

## Domeinmodel

- Tabel `favorieten (email, id)`, primaire sleutel op beide. `id` is de `api_id` van de map of regel in Orbit.
- Een regel behield haar `api_id` niet bij het inlezen. Die komt nu mee in `Schrijfregel`; de cachesleutel van het budget gaat daarom van `v1` naar `v2`.
