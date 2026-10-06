# Overzicht versimpelen

`2026-10-05` · Lennart ter Haar

## Waarom

- Het overzicht is nu een tabel met ticketaantallen per Jira-key en een losse aandachtsband; het antwoordt niet op de vraag "hoe staan mijn projecten ervoor?".
- Budget, vooral in uren, is het belangrijkste signaal; dat staat nergens op het overzicht.
- Het zijmenu met uitklapbare projecten werkt niet lekker en voegt naast de accountpagina weinig toe.

## Scope

- **Wel:** bovenaan "Mijn feed" met wat aandacht vraagt (te filteren en te negeren); per account een blok Beheer & Support en een blok Projecten met urenverbruik tegen de offerte; Orbit-cijfers bewaard in de database tegen de rate limit; zijmenu terug naar alleen accounts. Ontwerp: artifact "Overzicht redesign".
- **Niet:** projectdetailpagina met tickets (later; draait de keuze uit `2026-10-04-accountpagina-als-hoofdscherm.md` terug); budget afzetten tegen looptijd; facturatie en euro's (apart bespreken); feeditems op de to-do-lijst zetten (later); de lijst met verborgen projecten (blijft zoals hij is).

## Acceptatiecriteria

**Mijn feed**

1. Bovenaan staat "Mijn feed" met het aantal items, in een donker paneel; de lijst scrollt binnen het paneel.
2. Soorten, in deze volgorde: boven offerte (project boven 100% van zijn plafond), bijna op (boven 80%), eerste reactie (supporttickets op Waiting for first response, per account), sprint verlopen.
3. Filters Alles, Budget, Support en Sprints tonen elk hun aantal en filteren de lijst.
4. Elk item kan worden genegeerd en verdwijnt dan; "Terugzetten" haalt alle genegeerde items terug. Genegeerd blijft bewaard per gebruiker.
5. Een genegeerd item komt terug als de situatie verandert (bijvoorbeeld een ander aantal tickets dat op een eerste reactie wacht).

**Per account**

6. Alleen accounts met projecten waarvan ik eigenaar ben en die niet verborgen zijn.
7. Blok Beheer & Support: een kaart met het aantal open tickets; uitgeklapt een kolomgrafiek met bij ons, wachten op de klant en in sprint of on hold, elk als link naar die selectie in Jira; daaronder "Openen in Beheer & Support". Zonder gekoppelde organization een link naar het bewerkscherm.
8. Blok Projecten: per project naam, balk, percentage, geschreven, beschikbaar, offerte en bij overschrijding "+X u"; daaronder "Openen in Teamleader". Projecten staan gesorteerd op hun plafond, grootste eerst.
9. Het plafond is de offerte: de som van de verkochte uren in de actieve, akkoord gegeven versie van elke gekoppelde offerte. Zonder offerte is het wat er in Orbit beschikbaar staat.
10. Boven het plafond is de balk vol en roze en zijn de geschreven uren rood.
11. Een project klapt uit tot de mappen (met een kleine balk) en schrijfregels zoals Orbit die teruggeeft, in dezelfde kolommen.
12. Uren komen altijd uit de getallen van Orbit, nooit uit wat er in een taak- of mapnaam staat ("6u per maand").

**Orbit en rate limit**

13. Projecturen worden 15 minuten bewaard, offertes een dag, in de database; een herstart gooit niets weg.
14. Remt Orbit af, dan toont het overzicht de laatst bekende cijfers in plaats van een foutmelding. "Alles opnieuw ophalen" laat alles verlopen, maar houdt de laatst bekende cijfers als terugval.
15. De cijfers kloppen met Orbit voor twee steekproefprojecten, waarvan één SLA.

**Zijmenu**

16. Het zijmenu toont alleen accounts, zonder uitklapknop en zonder projecten.

## Open vragen

- Orbit geeft in het project alleen de onderste laag mappen terug, en de mappen van de offerte komen niet overeen met die van het project. Een offerteplafond per map kan daarom niet.
- Facturatie: welke vraag moet het overzicht beantwoorden? Orbit geeft per project geleverd, gefactureerd en nog te factureren.
