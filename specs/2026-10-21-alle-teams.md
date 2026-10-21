# Dashboard voor alle Norday-teams, niet alleen Culture

`2026-10-21` · Lennart ter Haar · Jira [PM-65](https://in10-rotterdam.atlassian.net/browse/PM-65)

## Waarom

- Het dashboard toont nu mijn projecten plus de hele Culture-map; de [collega-versie](2026-10-21-collega-versie.md) gaat naar alle PM's van Norday B.V.
- Norday B.V. is één van acht rechtspersonen in Orbit; de projecten staan in de mappen Culture (132), Public & services (125), Health (17) en Intern (20).
- Een analyse van die 274 open projecten laat zien dat het model buiten Culture breekt:
  - 63 projecten (18 klantnamen met " / ") krijgen geen Orbit-klant-id en zijn dus niet te koppelen aan Superhuman.
  - Eén organisatie valt uiteen in meerdere accounts (Gemeente Rotterdam 3 namen, BS&F 5).
  - SLA's worden op naam herkend; 15 onderhoudsprojecten (strippenkaarten, hosting, correctief/adaptief) missen.

## Scope

- **Wel:** iedereen ziet de eigen projecten (eigenaar in Orbit) in de mappen van Norday B.V.: Culture, Public & services, Health en Intern.
- **Wel:** klant-id's via het project ophalen in plaats van op klantnaam.
- **Wel:** projecten zonder klant netjes tonen.
- **Niet:** projecten van de andere rechtspersonen (Boldly-XR, Hear The Youth, On Your Marks, Tech to Market, TwentySeven, Unlock).

## Acceptatiecriteria

1. Het dashboard haalt per Norday-map `ListProjects` op met `mine=true` en `folderId`; projecten buiten die mappen verschijnen niet.
2. De sidebargroep "Overige Culture-platforms" is weg.
3. Elk project krijgt het klant-id uit Orbit zelf (via het project, niet de naam), ook als de klantnaam " / " bevat of twee klanten dezelfde naam hebben.
4. Projecten van een klant met meer platforms (zoals Gemeente Rotterdam) koppel je handmatig aan een platform, net als bij WO2Net.
5. Een project zonder klant staat onder een herkenbaar account (bijvoorbeeld "Intern") met een werkende link.
6. Een open project met een verstreken einddatum toont het signaal "einddatum verstreken", zodat de PM het in Orbit sluit of verlengt.
7. Een Overzicht voor een PM met ruim 50 projecten laadt zonder Orbit-foutmelding; een koude start mag langer duren, met zichtbare voortgang.

## Gerelateerd

- Projecttype (regulier, SLA, strippenkaart) en de groep Onderhoud: zie [PM-62](https://in10-rotterdam.atlassian.net/browse/PM-62).
- Eigenaar in Orbit bepaalt wat een PM in de sidebar ziet; alle projecten van een platform en account komen op de platformpagina ([PM-61](https://in10-rotterdam.atlassian.net/browse/PM-61)).
- Organisaties met meerdere Orbit-klanten koppel je via [PM-60](https://in10-rotterdam.atlassian.net/browse/PM-60); dubbele klanten in Orbit (twee keer Gemeente Rotterdam) schoont finance op.
