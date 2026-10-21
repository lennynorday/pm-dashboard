# Accountpagina en instellingen op de toolkit

`2026-10-21` · Lennart ter Haar · stap 5 van [de design-toolkit](2026-10-16-design-toolkit.md)

## Waarom

- De platformpagina en Instellingen zijn de laatste pagina's met eigen kopieën van kaart, knop en rij. Ze horen bij stap 5 van de toolkit-uitrol.
- Op de platformpagina toont Projecten de cijfers anders dan het overzicht. Ik wil per platform precies dezelfde Sprints, SLA's en Overige projecten zien als op het overzicht.
- Klant, PM, AM en contactpersonen staan nu op één regel onder de titel, en de lege linktypes vullen de halve pagina.

## Scope

- **Wel:** de platformpagina volgens variant B van de mockup (`public/mockups/toolkit-account-b.html`):
  - Wat aandacht vraagt staat als gele melding (`nd-alert`) direct onder de kop.
  - Daaronder een werkblad met twee kolommen. In de hoofdkolom staan Sprints, SLA's, Overige projecten en Tickets, in de zijkolom Mensen en Links.
  - Sprints, SLA's en Overige zijn dezelfde onderdelen als op het overzicht, met alle zichtbare projecten van het platform. Dat zijn ook projecten waarvan ik geen eigenaar ben.
  - Ontkoppelen en Verbergen staan per project in de uitgeklapte rij, naast Open in Orbit.
  - Links: alleen de ingevulde links. De lege linktypes staan onder één uitklapper "N links ontbreken".
- **Wel:** Instellingen volgens variant B: het profiel rechts in de kop, een inhoudsopgave links, en de koppelingen en inbox-bronnen als tegels.
- **Wel:** een schakelaar (`nd-switch`) in `toolkit.css` en op de voorbeeldpagina.
- **Niet:** andere berekeningen of signalen. Alles komt uit dezelfde functies als op het overzicht.
- **Niet:** de bewerk-, koppel- en nieuw-pagina's van een platform.

## Acceptatiecriteria

1. Op de platformpagina staan Sprints, SLA's en Overige projecten met dezelfde rijen, cijfers en uitklap als op het overzicht, alleen met de projecten van dat platform. Een blok zonder rijen staat er niet.
2. Een project zonder sprint dat geen SLA is, staat onder Overige projecten. Zo valt geen zichtbaar project weg.
3. In de uitgeklapte rij staan Verbergen en, bij een klant met meer platforms, Ontkoppelen. Op het overzicht verandert er niets.
4. Verborgen projecten staan onder een uitklapper onder de blokken, met Terugzetten.
5. De zijkolom blijft staan tijdens het scrollen. Onder 1080px komt hij onder de hoofdkolom.
6. Instellingen heeft dezelfde acties als nu: uitloggen, verbinden en ontkoppelen per bron, bronnen aan en uit, afzenders weer toestaan, de tabel openen en verversen.
7. De schakelaar is een `button` met `role="switch"` en `aria-checked`, met een focusrand van 3px.
8. In de omgebouwde modules staan geen hex-kleuren, `rgb()`-waarden of losse tekstmaten.
9. Toetsenbord en focus werken volgens WCAG 2.2 AA, ook op een smal scherm.

## Uitrol

1. Deze spec.
2. Platformpagina.
3. Instellingen, met de schakelaar in de toolkit.
