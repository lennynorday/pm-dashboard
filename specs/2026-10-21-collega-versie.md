# Collega-versie: lokaal installeren, gebruiken in je eigen browser

`2026-10-21` · Lennart ter Haar · Jira [PM-64](https://in10-rotterdam.atlassian.net/browse/PM-64)

## Waarom

- Collega-PM's van alle teams willen het dashboard gebruiken; nu draait het alleen op mijn Mac.
- Klant- en budgetdata blijven lokaal; hosting is voor nu te gevoelig.
- Installeren mag geen terminal of Node vragen; dubbelklikken en klaar.
- Collega's werken in Chrome (tabbladen, doorklikken naar Orbit), dus geen apart app-venster zoals Superhuman en Miro (Electron).

## Scope

- **Wel:** een `.pkg`-installer met de server (eigen Node), een achtergronddienst die bij inloggen start, en een app-icoon dat het dashboard in de standaardbrowser opent.
- **Wel:** Overzicht, Inbox (Slack en Gmail) en To-do's; data per gebruiker in `~/Library/Application Support/PM Dashboard`.
- **Wel:** de lokale MCP uit [PM-41](https://in10-rotterdam.atlassian.net/browse/PM-41) als `.mcpb` die Claude Desktop met één dubbelklik installeert.
- **Niet:** Claude-functies in de app (uitzetten bij Claude, urenvoorstel); die blijven alleen in mijn eigen versie.
- **Niet:** automatische updates; een nieuwe versie is een nieuwe `.pkg`.
- **Niet:** ondertekening met een Apple Developer-account; bij de eerste start kiest een collega één keer "Toch openen" in Privacy en beveiliging.
- **Niet:** Intel-Macs.

## Acceptatiecriteria

1. Een collega installeert met de `.pkg` zonder terminal; daarna staat PM Dashboard in Programma's.
2. Het icoon opent het dashboard in de standaardbrowser op een adres zonder poortnummer, bijvoorbeeld `http://pm.localhost`.
3. Het dashboard draait na een herstart of opnieuw inloggen vanzelf weer.
4. Google, Jira, Slack en Orbit zijn te verbinden vanaf `http://pm.localhost`; weigert een dienst die redirect, dan wordt het adres `http://localhost:3999`.
5. Elke collega vult een eigen Superhuman-token in bij Instellingen; er zit geen persoonlijk token in het pakket.
6. De versleutelingssleutel wordt per gebruiker aangemaakt bij de eerste start.
7. De server neemt alleen verzoeken aan op het eigen adres (onbekende `Host` geweigerd).
8. Er is geen Claude-knop of Claude-opdracht zichtbaar; in mijn eigen versie werkt Claude zoals nu.
9. Na installatie van de `.mcpb` kan Claude Desktop to-do's en inbox lezen en to-do's wijzigen, ook als het dashboard niet open is.
10. De installer waarschuwt als FileVault uit staat; de data staat onversleuteld in de map van de gebruiker.
11. `dist/` en databasebestanden kunnen niet per ongeluk in Git komen.
