# Design-toolkit

`2026-10-16` · Lennart ter Haar · Jira [PM-53](https://in10-rotterdam.atlassian.net/browse/PM-53)

## Waarom

- Overzicht, to-do's en navigatie gebruiken dezelfde patronen, maar elke CSS-module heeft er een eigen kopie van. Kaart, rij, knoppen, chips en koppen staan er tot vijf keer in, steeds net anders.
- Daardoor verschillen maten die gelijk zouden moeten zijn: knoppen van 32, 34, 40 en 44px, twee soorten tabs, zoekveld en formulierveld met een andere afronding, en dertien losse tekstmaten.
- Ik wil dezelfde vormtaal ook gebruiken in andere tools en in artifacts, zonder alles opnieuw te ontwerpen.

## Scope

- **Wel:** `public/toolkit/toolkit.css`. Dit is één stylesheet zonder framework, met tokens, basisstijl en bouwstenen. De klassen volgen BEM met het voorvoegsel `nd-`.
- **Wel:** `public/toolkit/index.html`, een voorbeeldpagina met alle bouwstenen en de regels. Die staat op `/toolkit/index.html`.
- **Wel:** het dashboard draait op de toolkit:
  - `app/tokens.css` en de tokens in `globals.css` vervallen.
  - De modules gebruiken de `nd-`-klassen in plaats van eigen kopieën.
- **Niet:** een React-componentbibliotheek of een npm-pakket.
- **Niet:** een donkere modus voor het dashboard.
- **Niet:** de toolkit in een eigen repo. Dat kan later, als een tweede tool hem gebruikt.

## Keuzes

- **Kleur:** alleen de vijf merkkleuren, gemengd met wit of doorzichtig via `color-mix()`. De statuskleuren rood, groen en paars zijn de enige uitzondering, omdat Pink te weinig contrast heeft voor tekst.
- **Vlakken:** drie lagen: grond, kaart en rij. Nooit een kaart in een kaart.
- **Knoppen:** twee hoogtes, ook voor de ronde knoppen:
  - 44px voor losse acties op de pagina
  - 32px (`--small`) binnen rijen en kaarten
- **Tabs:** één stijl, de rustige filterknoppen van Aandacht. De donkere wissel op de to-do-pagina vervalt.
- **Velden:** het formulierveld is leidend: wit, 44px hoog, afronding van 18px. Het zoekveld is hetzelfde veld met een icoon.
- **Tekst:** zes tokens: `display`, `title`, `item`, `body`, `meta` en `small`, plus `nav`. Er staan geen losse px-maten meer in de modules.
- **Diepte:** een binnenrand (`--ring`) voor randen. Een schaduw alleen voor wat zweeft: menu, toast en dialoog.
- **Focus:** overal 3px. Pink op lichte vlakken, geel op donkere.

## Uitrol

Eén PR per stap, zodat elke PR klein blijft.

1. Toolkit en voorbeeldpagina toevoegen, en `globals.css` laten importeren uit `toolkit.css`. Er verandert dan nog niets zichtbaars, behalve de licht aangepaste tinten.
2. To-do's: Todos en TodoDialoog. Hierin zit de wissel naar filterknoppen. Deze stap gaat voor, omdat Uitzetten bij Claude op de to-do-pagina voortbouwt (2026-10-19, Lenny).
3. Navigatie (`components/Sidebar`).
4. Overzicht:
   - Feed, Sprints, Slas en Overige, via `Sectie.module.css`
   - PageHeading, Melding, Toast
   - `app/grid.module.css`
5. De rest: Inbox, Instellingen en Platforms.

## Acceptatiecriteria

1. `/toolkit/index.html` toont alle bouwstenen en werkt op een smal scherm.
2. Een andere tool kan de toolkit gebruiken met één `<link>` naar `http://localhost:3999/toolkit/toolkit.css`.
3. Na elke stap zien de omgebouwde pagina's er hetzelfde uit als ervoor, op de bewuste keuzes hierboven na. Dat controleer ik met een screenshot voor en na.
4. In de omgebouwde modules staan geen hex-kleuren, `rgb()`-waarden of losse tekstmaten meer.
5. Na stap 5 bestaat `app/tokens.css` niet meer en zijn de dubbele knop-, kaart- en chipstijlen weg.
6. Toetsenbord en focus blijven werken volgens WCAG 2.2 AA.

## Open vragen

- Artifact-versie: geparkeerd. Kan met de CSS in de pagina zelf en een donkere modus. De echte lettertypes kunnen alleen mee als Norday een webfontlicentie heeft voor Suisse en Apercu (navragen bij de Design Lead), anders Barlow Condensed en Inter.
- `public/` staat nu niet in git, behalve straks `public/toolkit/`. Klopt het dat de mockups bewust buiten git blijven?
