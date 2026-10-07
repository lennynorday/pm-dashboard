# Redesign in de Intelly-vormtaal

`2026-10-06` · Lennart ter Haar

## Waarom

- Het dashboard heeft een vaste visuele basis gekregen: de Intelly-shot (`docs/inspiratie/intelly-dashboard.jpg`), in Norday-kleuren en -letters.
- De huidige schermen volgen die vormtaal niet. De accountpagina mist bovendien zijn grootste waarde: snelle links naar Slack, Superhuman, Jira en omgevingen staan onderaan en zijn niet uit te breiden.
- Het ticketblok op de accountpagina is druk en mengt Jira met Beheer & Support.
- Goedgekeurde mockups: `public/mockups/redesign-a-overzicht.html` en `redesign-a-account.html`.

## Scope

- **Wel:** zijmenu, overzichtspagina en accountpagina in de nieuwe vormtaal; linkgroepen met Figma en eigen links; vereenvoudigd ticketblok.
- **Wel:** instellingen en "Gegevens bewerken" krijgen dezelfde basisstijl (kleuren, knoppen, kaarten), zonder nieuwe indeling.
- **Niet:** nieuwe databronnen, signalen of cijfers; dark mode.

## Acceptatiecriteria

Algemeen

1. Grond, kaarten, knoppen en labels volgen de mockups: zachte lila-grijze grond, afgeronde kaarten, Dark-pillknoppen, koppen in Apercu-kapitalen.
2. Het zijmenu is een zwevend Dark-paneel: Norday-logo klein in lila boven de titel "PM-DASHBOARD"; het logo komt uit `docs/huisstijl/logo/norday.svg`.
3. De actieve pagina in het menu is een lila vlak met Dark tekst, zonder roze.
4. Het werkgebied is hooguit 1240px breed.
5. Rechtsboven staat de Orbit-sync als één pil: "Orbit HH:MM" en de knop "Verversen". De volledige zin staat in de tooltip en voor schermlezers.

Overzicht

6. De feed filtert met tabs in de kop van het feedpaneel (Alles, Budget, Support, Sprints, elk met aantal); geen tegels.
7. Feedmeldingen tonen geen gekleurd soortlabel meer; icoon, account, titel en toelichting blijven.
8. Een account met Beheer & Support toont een lila knop "[aantal] open supporttickets ↗", zonder apart label ernaast.
9. Projectregels zijn verticaal gecentreerd; "Openen in Teamleader" is een pijlicoon direct achter de projectnaam, met een volledig label voor schermlezers.

Accountpagina

10. "Gegevens bewerken" is een rond potloodicoon naast de titel; accountmanager en contactpersonen staan als één regel eronder.
11. "Vraagt nu aandacht" staat direct onder de titel en ontbreekt als er niets is.
12. Daaronder staan de links in vier groepen: Samenwerken (Slack intern, Slack met klant, Superhuman intern, Superhuman gedeeld), Tools (Jira, Drive, Figma), Omgevingen (Acceptatie, Productie, CMS acceptatie, CMS productie) en Overig.
13. Overig toont de eigen links van het account met hun eigen naam, plus "Link toevoegen" (naam en adres). Een toegevoegde link staat er direct, ook voordat Superhuman hem verwerkt heeft. Bij 4 eigen links verdwijnt de knop.
14. Het linktype Offerte bestaat niet meer.
15. Projecten staan in dezelfde lijst als op het overzicht; projectnummer, status, looptijd en "Verbergen" zitten in de uitgeklapte regel.
16. Tickets zijn twee losse kaarten: Jira (actieve sprint, gepland, backlog, lopende sprint) en Beheer & Support (open, wachten op ons). Het overzicht per supportstatus vervalt.

Superhuman

17. De app leest en schrijft de kolommen Figma en Eigen links (één per regel: `Naam https://adres`, hooguit 4).
18. Na livegang staat een bestaande Overig-link als eerste eigen link met de naam "Overig"; daarna zijn de kolommen Offerte en Overig verwijderd.

Kwaliteit

19. Alle bestaande functies werken nog: filteren, verbergen en terugzetten van meldingen, verversen, uitklappen, projecten verbergen, zijmenu inklappen en de overige accounts.
20. WCAG 2.2 AA; status nooit alleen met kleur; geen horizontaal scrollen op 390px breed.

## Domeinmodel

- **Eigen link:** naam en adres die de PM zelf bij een account zet; hooguit 4 per account, gedeeld via Superhuman.
- **Linkgroep:** vaste indeling van linktypen op de accountpagina; alleen Overig bevat eigen links.
