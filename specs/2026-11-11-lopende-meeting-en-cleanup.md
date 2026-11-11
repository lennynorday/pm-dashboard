# Lopende meeting en clean-up van notulen

`2026-11-11` · Lennart ter Haar · geen ticket · mockup: `public/mockups/meeting-bezig-cleanup.html`

## Waarom

- Een meeting die volgens de agenda nog loopt, toont een leeg paneel met alleen "Geen notulen". Is hij eerder klaar, dan kan Lennart niets doen tot de agendatijd voorbij is.
- Er wordt soms over collega's gesproken in een meeting. Dat mag niet in notulen komen die collega's kunnen teruglezen, en het transcript staat ook in het gedeelde Plaud-account.

## Scope

- **Wel:** een lopende meeting toont de stappen, met Ingepland actief ("Loopt nog tot 09:45"), een chip "Bezig" en de knop "Meeting al afgelopen". Die knop laat de notulen-flow direct starten; "Toch nog bezig" zet dat terug zolang de agendatijd niet voorbij is.
- **Wel:** Claude laat persoonlijke opmerkingen, kritiek en roddel over personen weg uit de notulen en geeft de weggelaten passages apart terug. Onder Notulen staat "N passages weggelaten · Bekijken", met per passage Terugzetten.
- **Wel:** bevat het transcript zulke opmerkingen, dan toont de meeting de melding "Ruim de opname in Plaud op", met een link naar Plaud web en "Gedaan".
- **Niet:** iets in Plaud aanpassen of verwijderen (de Plaud CLI kan alleen lezen); een teruggezette passage in een al aangemaakte Superhuman-pagina zetten (dat doet Lennart zelf).

## Acceptatiecriteria

1. Een meeting met start ≤ nu < eind krijgt een status met stap 0, de tekst "Loopt nog tot HH:MM" en telt niet mee als nog te doen.
2. "Meeting al afgelopen" bewaart dat per meeting; de meeting telt daarna als afgelopen en het dashboard zoekt meteen de opname.
3. "Toch nog bezig" staat bij Ingepland zolang de meeting vroeg klaar is gezet en de agendatijd nog loopt, en draait het terug.
4. De notulenprompt vraagt om weggelaten passages in een apart blok; dat blok komt niet in de notulentekst en wordt per meeting bewaard.
5. Terugzetten zet de passage als bullet onderaan het onderwerp waar hij bij hoort en haalt hem uit de lijst. Staan de notulen al in Superhuman, dan zegt het paneel dat de passage daar niet vanzelf bijkomt.
6. Gaf Claude aan dat het transcript opmerkingen over personen bevat, dan staat de Plaud-melding in het paneel tot "Gedaan".
