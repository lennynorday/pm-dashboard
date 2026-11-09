# Notulen delen via Gmail en Slack

`2026-11-06` · Lennart ter Haar

## Waarom

- Notulen die in Superhuman staan, worden nu vaak niet gedeeld: de klant krijgt geen mail en het team geen Slack-bericht.
- Het dashboard zet het bericht klaar en ziet zelf dat het verstuurd is, zodat Lenny alleen nog controleert en verstuurt.
- Bouwt voort op spec `2026-11-06-notulen-maken`. Ontwerp: `public/mockups/meetings-week.html`, stap Gedeeld.

## Scope

- **Wel:** stap 6 (Gedeeld) voor extern, intern en Team, inclusief herkennen dat er verstuurd is en een seintje bij vastlopen.
- **Niet:** automatisch versturen. Privé-meetings worden nooit gedeeld.

## Acceptatiecriteria

1. Er wordt nooit iets verstuurd zonder klik van Lenny.
2. **Extern:** het paneel toont een ontvangerslijst als adresveld, met chips met een kruisje en een invoerveld. Standaard staat de contactpersoon met rol PO uit de accountgegevens erin. "Aan alle genodigden" voegt de externe genodigden toe.
3. "Zet concept klaar in Gmail" maakt een Gmail-concept aan de gekozen ontvangers, met de link naar de Superhuman-pagina, en toont "Open concept in Gmail".
4. Het dashboard ziet dat het concept verstuurd is aan een verzonden mail in die thread, en zet de stap dan op klaar. Een weggegooid concept laat de stap open.
5. **Intern:** Claude schrijft een Slack-bericht met de link en de acties voor het `slack-intern`-kanaal van het platform. Lenny past het aan in het paneel en klikt "Verstuur naar #kanaal". Het dashboard plaatst het onder Lenny's naam en zet de stap op klaar.
6. **Team:** gelijk aan intern, in het kanaal dat bij die Team-serie is ingesteld.
7. Slack vraagt daarvoor het recht `chat:write`. Een koppeling zonder dat recht toont "Opnieuw verbinden".
8. Bij Privé staat de stap op "niet nodig" en gaat de flow door naar Actiepunten.
9. Na 4 uur nog niet gedeeld: de meeting wordt rood en er komt een item in de inbox, met "Naar de meeting" en "Geen notulen".
10. "Openen" bij een afgeronde stap Gedeeld opent de verzonden mail of het Slack-bericht.
