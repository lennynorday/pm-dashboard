# Reserveringen per taak bij dubbele taaknamen

`2026-10-22` · Lennart ter Haar

## Waarom

- Bij IHC / Onsland / Doorontwikkeling 2026 meldt het dashboard "16,8u te veel gepland" op Toegankelijkheid. In Orbit staat er 72,5u gereserveerd en is er niets overboekt.
- Alle drie de sprints heten in Orbit "Sprint (nog te verdelen)". `ListReservations` per project geeft alleen de taaknaam, dus het dashboard gokt bij welke sprint een reservering hoort (`wijsToe`). Bij deze opzet gokt het fout: 90,5u in plaats van 72,5u.
- Sprints met dezelfde taaknaam komen vaker voor.

## Scope

- **Wel:** komt een taaknaam in een project vaker voor, dan haalt het dashboard de reserveringen van die taken per taak op (`ListReservations` met `taskId`). Zo hoort elke reservering exact bij haar regel.
- **Wel:** unieke taaknamen blijven via de ene aanroep per project gaan, zoals nu. Daar is maar één regel mogelijk.
- **Niet:** het gokken op ruimte en startdatum. Dat valt weg, omdat er niets meer te gokken is.
- **Niet:** de planning (`ListPlannedEntries`). Die heeft hetzelfde probleem niet: daar komt de regel uit de sprint.

## Acceptatiecriteria

1. Bij IHC / Onsland telt Toegankelijkheid 72,5u gereserveerd, net als de tooltip in Orbit, en staat er geen "te veel gepland".
2. Verhalen en Organisaties en Poetssprint krijgen de reserveringen die Orbit bij die taken toont.
3. Een project zonder dubbele taaknamen doet niet meer Orbit-aanroepen dan nu.
4. Per dubbele taak één extra aanroep, gecachet voor 15 minuten zoals de andere.
5. Zolang een van die aanroepen laadt of mislukt, gedraagt het project zich zoals nu bij laden of fout.

## Besluiten

- Per taak opvragen in plaats van taken in Orbit hernoemen, omdat dubbele namen vaker voorkomen (2026-10-22, Lenny).
- Alleen voor dubbele namen, zodat drukke projecten onder de rate limit van Orbit blijven (2026-10-22).
