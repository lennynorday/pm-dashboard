# Notulen maken: van Plaud-opname naar Superhuman

`2026-11-06` · Lennart ter Haar

## Waarom

- Na een meeting moet Lenny nu zelf het transcript ophalen, Claude om notulen vragen en ze op de goede plek in Superhuman zetten. Dat gebeurt vaak niet, of te laat.
- Plaud neemt al automatisch op. Wat ontbreekt, is de stap van opname naar notulen op de goede plek, en zicht op waar elke meeting staat.
- Bouwt voort op de Meetings-pagina (spec `2026-11-06-meetings-pagina`). Ontwerp: `public/mockups/meetings-week.html` en `meeting-states.html`.

## Scope

- **Wel:** een Plaud-opname bij een meeting vinden, het transcript ophalen, notulen laten maken door Claude, een pagina in Superhuman, de status per meeting (stappen 1 tot en met 5) en een seintje bij vastlopen.
- **Niet:** delen via Gmail of Slack (spec Delen) en de actiepunten-feed (spec Actiepunten). Transcriberen gebeurt niet door het dashboard zelf: dat blijft "Auto-generate" in Plaud.

## Acceptatiecriteria

1. Het dashboard leest opnames uit het gedeelde Plaud-account via de Plaud CLI, alleen lezend.
2. Een opname hoort bij een meeting als die in tijd overlapt met een meeting uit Lenny's agenda die notulen krijgt. Opnames zonder zo'n meeting negeert het dashboard.
3. Een afgelopen meeting doorloopt de stappen Ingepland, Opgenomen, Transcript, Notulen, In Superhuman, Gedeeld en Actiepunten. Deze spec maakt de eerste vijf.
4. Heeft een opname nog geen transcript, dan staat de meeting op "Wacht op jou", met een knop "Open in Plaud web" naar die opname.
5. Zodra er een transcript is, laat het dashboard Claude zonder klik notulen maken. Het dashboard controleert elke 5 minuten op nieuwe opnames en transcripten.
6. De notulen volgen het vaste format: Aanwezig en Doel bovenaan (Doel niet bij een standup), genummerde onderwerpen met bullets, en acties in de tekst als `**Actie Naam:** wat`, zonder maximum aan bullets.
7. De notulen komen als subpagina onder de pagina Notulen: de gedeelde doc van het platform bij een externe deelnemer, de interne doc bij alleen Norday. Team- en Privé-notulen gaan naar het doc Lennys Dashboard › Notulen, met een subpagina per reeks (en daaronder per meeting) of per losse meeting.
8. De week toont per meeting één gekleurde dot: groen klaar, geel wacht op jou, paars dashboard bezig, rood vastgelopen, grijs geen notulen. Dezelfde dot staat in de lijst, met een kleine legenda rechts onder de week.
9. Het paneel van een meeting toont "x van 7 stappen klaar" en de stappen als checklist: afgerond grijs met een vinkje, de huidige stap uitgelicht met uitleg en knop, afgeronde stappen met "Openen" waar iets te openen is.
10. "Openen" bij Notulen toont de notulen in een overlay.
11. "Notulen te doen" in het zijpaneel toont de meetings van deze en vorige werkweek die nog niet klaar zijn, en scrolt binnen het paneel.
12. Geen opname gevonden, of na 4 uur nog geen transcript: de meeting wordt rood en er komt een item in de inbox, met "Naar de meeting" en "Geen notulen".
13. Faalt Plaud, Claude of Superhuman, dan toont de meeting dat met een melding en kan de stap opnieuw. Er gaat geen werk verloren.

## Domeinmodel

- **Opname:** een Plaud-bestand met starttijd en duur, eventueel met transcript.
- **Notulenstap:** de plek waar een meeting in de flow staat, met wie aan zet is (jij of het dashboard) en sinds wanneer.
- **Vastgelopen:** 4 uur na de meeting nog op een stap waar jij aan zet bent.
- **Notulenpagina:** de Superhuman-subpagina die bij een meeting hoort.

## Open vragen

- Kan de Plaud CLI het gedeelde account lezen en de opname-URL voor Plaud web geven? Dit is de eerste stap van de bouw. Lukt het niet, dan stopt de bouw voor een keuze.
- Superhuman-pagina's maken kan niet met het huidige token, want dat is beperkt tot de accounttabel. Lenny maakt een nieuw token met schrijfrecht op de project-docs en Lennys Dashboard.
