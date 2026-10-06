# Platforms als hoofdeenheid

`2026-10-06` · Lennart ter Haar

## Waarom

- Wat een PM beheert is een website (platform), niet een klant: WO2Net heeft er drie (Oorlogsbronnen, Oorlog voor de Rechter, Onsland), elk met eigen PM, Jira, support, contacten en links.
- Nu draait het dashboard om de klant, waardoor gegevens en projecten van verschillende websites door elkaar lopen.
- Orbit weet niet bij welke website een project hoort: er is geen veld voor, en de projectnamen schrijven het steeds anders.
- Het moet werken voor het hele bedrijf, niet alleen voor de accounts van één PM.

## Scope

- **Wel:** een platformpagina vervangt de accountpagina; de klant krijgt geen eigen pagina meer.
- **Wel:** het menu toont alleen platforms; de klant staat er secundair bij ([ontwerp](../public/mockups/platforms-menu.html), variant A).
- **Wel:** het overzicht (feed en budgetten) per platform in plaats van per klant.
- **Wel:** de PM van een platform is de projectverantwoordelijke (eigenaar) van zijn open projecten in Orbit; "mijn platforms" zijn de platforms met een open project waarvan ik eigenaar ben.
- **Wel:** Orbit-projecten zelf koppelen aan een platform; bij een klant met één platform gaat dat vanzelf.
- **Wel:** platforms zijn rijen in de bestaande tabel in Superhuman ([spec](2026-10-06-accountgegevens-in-superhuman.md)); geen platformnamen in de code.
- **Niet:** platforms of koppelingen afleiden uit Orbit-projectnamen.
- **Niet:** een eigen veld in Orbit; dat kan later, als het bedrijf het afspreekt.
- **Niet:** een PM-veld in Superhuman; de PM komt uit Orbit.
- **Niet:** een platform verwijderen in de app; dat doe je in Superhuman.
- **Niet:** weergaven voor AM's; het dashboard is voor PM's, AM's komen later.
- **Niet:** een archief met platforms zonder open projecten; dat komt later. Klopt "Mijn platforms" niet, dan pas je de eigenaar aan in Orbit en ververs je.

## Acceptatiecriteria

1. De tabel heeft per platform één rij, met de kolommen _Platform_ en _Orbit-projecten_ (projectnummers); de sleutel is Orbit-id plus Platform.
2. De zeven bestaande accounts hebben elk één platform met hun huidige gegevens; WO2Net heeft er drie.
3. Een klant zonder rij in Superhuman heeft vanzelf één platform met de naam van de klant.
4. Elk platform heeft een eigen pagina met klant, PM, AM, contactpersonen, links, aandachtspunten, gekoppelde projecten met budget, en tickets; de klantnaam staat in de regel met PM en AM, niet boven de titel.
5. Bij een klant met één platform horen alle open projecten van die klant vanzelf bij dat platform.
6. Bij een klant met meerdere platforms is een open project dat nergens aan gekoppeld is een signaal "Koppelen": in het Aandacht-veld van elke platformpagina van die klant en in de feed op het overzicht, met een knop naar een scherm waar je per project een platform of "geen platform" kiest.
7. Het menu toont onder "Mijn platforms" de platforms met een open project waarvan ik in Orbit eigenaar ben, alleen platforms, als gelijkwaardige items zonder inspringing; staat de klant anders genoemd dan het platform, dan staat de klantnaam klein op een tweede regel.
8. Het overzicht toont de feed en de budgetten per platform; elk feeditem noemt het platform.
9. Per platform bewerk je naam, Jira-keys, support-organisaties, contactpersonen en links; AM en kortere klantnaam bewerk je per klant en gelden voor al zijn platforms.
10. Je kunt een platform toevoegen aan een klant.
11. De code bevat geen platformnamen.

## Domeinmodel

- **Account** — klant uit Orbit (Orbit-klant-id); heeft een kortere naam, een AM en één of meer platforms. Geen eigen pagina.
- **Platform** — een website van een account; heeft een naam, Jira-keys, support-organisaties, contactpersonen, links en gekoppelde Orbit-projecten. De PM is de eigenaar van die projecten in Orbit; dat kunnen er meer zijn.
- **Koppeling** — een open Orbit-project hoort bij één platform van zijn account, of uitdrukkelijk bij "geen platform" (zoals "WO2NET / Account").
