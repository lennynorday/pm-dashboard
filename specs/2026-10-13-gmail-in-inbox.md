# Gmail in de Inbox

`2026-10-13` · Lennart ter Haar · Jira [PM-49](https://in10-rotterdam.atlassian.net/browse/PM-49)

## Waarom

- De Inbox toont nu alleen Slack ([inbox-en-todos](2026-10-12-inbox-en-todos.md), [inbox-vervolg](2026-10-13-inbox-vervolg.md)). Vragen per mail staan los daarvan in Gmail, dus ik moet op twee plekken kijken wat er op me wacht.
- Met mail erbij wordt de Inbox de ene plek waar ik bepaal wat naar To-do's gaat en wat ik negeer.

## Scope

- **Wel:** de bestaande Google-login vraagt ook `gmail.readonly` en bewaart per gebruiker een refresh token. Elke collega leest zo alleen zijn eigen mailbox.
- **Wel:** mailgesprekken (threads) als Inbox-item met bron `gmail`, één item per gesprek.
- **Wel:** een uitsluitlijst per gebruiker met afzenders en domeinen, te vullen met een knop bij een item en te beheren op Instellingen.
- **Wel:** een kopje Inbox op Instellingen met twee schakelaars, Slack en Gmail, die bepalen welke bronnen in de Inbox komen. De uitsluitlijst staat onder hetzelfde kopje.
- **Wel:** synchroniseren bij het openen van de Inbox en daarna elke 5 minuten, net als Slack.
- **Niet:** iets terugschrijven naar Gmail (archiveren, labels, gelezen markeren). Er komt geen `gmail.modify`.
- **Niet:** antwoorden vanuit het dashboard. De link opent de thread in Gmail.
- **Niet:** mail van vóór de eerste synchronisatie, behalve mail met een ster.
- **Niet:** mailitems beschrijven in de lokale MCP ([PM-41](https://in10-rotterdam.atlassian.net/browse/PM-41)). Dat komt later.

## Acceptatiecriteria

1. Na het inloggen met Google geeft de gebruiker ook leestoegang tot Gmail. Iedereen logt daarvoor één keer opnieuw in. Zonder Gmail-toegang toont de Inbox geen foutpagina, maar alleen de andere bronnen.
2. Een gesprek komt in de Inbox als er een mail in Postvak IN staat, gelezen of niet, met de gebruiker in Aan of CC, en de afzender niet op de uitsluitlijst staat.
3. Gmail-categorieën (Primair, Promoties, Updates) spelen geen rol; nieuwsbrieven en notificaties filter je weg met de uitsluitlijst.
4. Een gesprek met een ster komt altijd in de Inbox, ook als het van een uitgesloten afzender komt of van vóór de eerste synchronisatie is.
5. Alleen mail vanaf de eerste synchronisatie telt mee (een `gmail_start` per gebruiker, net als `slack_start`).
6. Eén item per gesprek: titel is het onderwerp, bericht is de eerste ±200 tekens van de laatste mail, met de naam van de afzender, de tijd en een link naar de thread in Gmail.
7. Een nieuwe mail in een gesprek dat al in de Inbox staat, werkt dat item bij en maakt geen tweede item.
8. Na een eigen antwoord in het gesprek, of na archiveren in Gmail, staat het item bij de volgende synchronisatie niet meer in de Inbox. Staat het al op To-do's, dan blijft het daar. Alleen lezen haalt een item niet weg.
9. Een genegeerd gesprek komt terug in de Inbox bij een nieuwe mail van iemand anders.
10. Met de knop "Nooit meer van deze afzender" of "Nooit meer van dit domein" bij een mailitem verdwijnt dat item, en komt er geen nieuw item meer van die afzender of dat domein. Uitzondering: mail met een ster.
11. Op Instellingen staat onder het kopje Inbox de uitsluitlijst. Een regel daaruit verwijderen werkt vanaf de volgende synchronisatie.
12. "Naar to-do" en "Negeren" werken voor mailitems hetzelfde als voor Slack-items.
13. Onder het kopje Inbox op Instellingen staan de schakelaars Slack en Gmail. Staat een schakelaar uit, dan synchroniseert die bron niet en zijn de items uit die bron verborgen in de Inbox. Weer aanzetten toont ze opnieuw. Items op To-do's blijven altijd staan.
14. Zet je Gmail aan zonder dat je Gmail-toegang hebt gegeven (geweigerd op het toestemmingsscherm, of een oude sessie), dan vraagt Google opnieuw om toestemming. Weigeren laat de schakelaar uit staan; inloggen blijft werken.

## Domeinmodel

- **Mailgesprek:** een Gmail-thread. De sleutel in `taken` is `bron gmail` + `bron_id <thread-id>`, en `url`, `bericht` en `tijd` verwijzen naar de laatste mail, net als bij een DM-gesprek.
- **Uitsluiting:** een e-mailadres of een domein per gebruiker. Een domein sluit alle adressen op dat domein uit.

## Aanpak

- De login vraagt `access_type=offline` en `prompt=consent` en bewaart de refresh token versleuteld (`lib/crypto.ts`). Nu bewaart de login alleen het profiel.
- Geen Gmail-categorieën: die zijn onvoorspelbaar en `category:primary` werkt niet via de API. Notificaties en nieuwsbrieven zet je zelf op de uitsluitlijst.
