# Accountpagina als hoofdscherm

`2026-10-04` · Lennart ter Haar · vervangt de projectpagina's

## Waarom

- Ik denk en werk per account; een project is een regel binnen een account, geen eigen bestemming.
- De projectpagina's voegden weinig toe naast de accountpagina en verdelen de aandacht over twee halve schermen.
- Eén sterke accountpagina geeft in één oogopslag: hoe staan de projecten ervoor, wat speelt er in Jira en support, wie en waar, en wat vraagt aandacht.

## Scope

- **Wel:** projectpagina's verwijderen; de accountpagina indelen in vier blokken (aandachtspunten, projecten, Jira en support, mensen en links); budget en uren per project uit Orbit; aandachtspunten per account op basis van echte data. Gebouwd in drie stappen, elk een eigen PR.
- **Niet:** to-do's uit Superhuman, aandachtspunten op home (volgt na stap C), kansenblok (roadmap #19), bewerkscherm voor de config.

## Acceptatiecriteria

**Stap A: projectpagina's weg, nieuwe indeling**

1. De route `/projecten/...` en de code die alleen daarvoor bestaat, zijn verwijderd; nergens linkt nog iets naartoe.
2. De accountpagina toont van boven naar beneden: naam met AM en contactpersonen, Projecten, Jira en support, Links.
3. Elk project is een regel met naam, projectnummer, status, einddatum, link "Openen in Orbit", de links uit de config van dat project, en de knop Verbergen.
4. Elke projectregel heeft een anker (`#project-1607`); in het zijmenu en op home springt een project naar zijn regel op de accountpagina.

**Stap B: budget en uren per project**

5. Elke projectregel toont een budgetbalk op uren (geleverd gedeeld door totaal), met het percentage als tekst en de uren als "geleverd van totaal".
6. Daarnaast staan budget, gefactureerd en nog te factureren in euro's.
7. Boven 80% en boven 100% verandert de balk van stijl en staat er een label, niet alleen een andere kleur.
8. De cijfers komen uit `GetProjectFinancials`, zijn 15 minuten gecachet en kloppen met Orbit voor twee steekproefprojecten.

**Stap C: aandachtspunten**

9. Bovenaan de accountpagina staat een blok Aandachtspunten met per punt een melding: project boven 80% budget, verlopen actieve sprint, en supporttickets die op een eerste reactie wachten.
10. Is er niets, dan staat er "Geen aandachtspunten".

## Open vragen

- Stap C: na hoeveel dagen telt een supportticket als "blijft liggen"?
