# Briefing: PM-dashboard voor Lenny (Norday)

## 1. Context en doel

Ik ben Lenny (Lennart ter Haar), projectmanager in het Client Services-team van Norday. Ik wil één plek waar ik per klant (account) en per project zie hoe het ervoor staat: budget, uren, Jira-status en alle links die ik dagelijks nodig heb.

- **Gebruiker:** voorlopig alleen ik. Later misschien andere PM's, maar daar bouwen we nu niet op.
- **Leerproject:** ik ben beginner met Claude Code, Git en webdevelopment. Ik wil dit project gebruiken om het te leren.

## 2. Hoe je met mij werkt (lees dit eerst)

### Altijd één stap tegelijk
Ik ben slecht in het volgen van instructies met meerdere stappen. Dit is de belangrijkste regel van deze briefing:

- **Eén actie per bericht.** Moet ik zelf iets doen, zoals installeren, inloggen, een token aanmaken, een bestand neerzetten of een commando typen, geef me dan precies één ding om te doen. Geen lijst met stappen.
- **Wacht op mij.** Wacht tot ik "klaar" zeg, of vertel wat ik zie, voordat je de volgende stap geeft.
- **Controleer eerst.** Kijk na elke stap of het gelukt is, bijvoorbeeld door een commando te draaien of een bestand te lezen, voordat je verdergaat. Lukt het niet, los dat eerst op.
- **Zeg waar ik ben.** Begin elke instructie met waar we zijn, bijvoorbeeld "Stap 2 van 5: token voor Jira aanmaken".
- **Wees concreet.** Zeg precies waar ik moet klikken of wat ik moet typen. Geef commando's in een los codeblok dat ik kan kopiëren.
- **Doe het zelf als het kan.** Alles wat je zelf kunt uitvoeren, zoals commando's, bestanden aanmaken of controles, doe je zelf. Vraag mij alleen wat echt alleen ik kan.

### Verder
- Leg in gewone taal uit wat je gaat doen voordat je het doet, en waarom. Gebruik geen jargon zonder uitleg.
- Werk per fase (zie hoofdstuk 8). Begin niet aan een volgende fase zonder mijn akkoord.
- Vertel na elke fase hoe ik het resultaat zelf kan bekijken of testen.
- Volg de Norday-conventies: de `coding-patterns`- en `git-workflow`-skills uit de norday-engineering-plugin als die geïnstalleerd is. Kort samengevat:
  - de eenvoudigste oplossing wint
  - TypeScript zonder `any`, en geen Tailwind
  - WCAG 2.2 AA
  - data van externe API's parse je aan de grens naar getypeerde objecten
  - nooit op `main` werken, maar een feature branch met een pull request
- Vraag het als iets onduidelijk is, in plaats van aan te nemen.
- Alle UI-teksten zijn in het Nederlands. Gebruik in UI-teksten geen em-dashes.

## 3. Architectuur

- **Draait lokaal** op mijn laptop (`localhost`). In v1 is er geen hosting en geen inlogsysteem. Reden: budget- en factuurdata horen niet zonder beveiliging online.
- **Stack:** Next.js (App Router) met TypeScript en CSS Modules. Kies iets anders als je een eenvoudiger alternatief hebt, maar leg dat dan eerst aan mij voor.
- **API-aanroepen** gebeuren altijd server-side. Tokens komen nooit in de browser.
- **Geheimen:**
  - API-tokens staan in `.env.local`, en dat bestand staat in `.gitignore`.
  - Maak een `.env.example` met alleen de namen van de variabelen.
  - Help me per token stap voor stap het token aan te maken.
- **Repository:** privé op GitHub. Ik vraag zelf na of hij onder de Norday-organisatie moet staan.
- **Configuratie:** de koppeling tussen accounts, projecten, Jira-keys en links staat in één getypeerd configbestand, bijvoorbeeld `config/accounts.ts`. Die vul ik zelf. Een bewerkscherm in de app komt later.
- **Cache:** externe data krijgt een eenvoudige cache van ongeveer 15 minuten, met een knop "Verversen". Toon altijd wanneer de data is opgehaald.
- **Foutafhandeling:** valt een bron uit, dan werkt de rest van de pagina gewoon door. Toon dan per blok een duidelijke melding.

## 4. Domeinmodel

Gebruik deze namen in de code:

- **Account:** een klant, bijvoorbeeld Centraal Museum Utrecht. Een account heeft een naam, een account manager (AM), contactpersonen, projecten en links.
- **Project:** hoort bij één account. Bevat de Orbit-project-id, Jira-projectkey(s), een status en links.
- **Budget:** budget in uren en in waarde, verbruik in uren en in waarde, en het gefactureerde bedrag.
- **Urenregistratie:** uren per taak, per persoon en per week.
- **JiraOverzicht:** aantallen per status, open bugs, tickets op QA en een link naar het board.
- **Link:** heeft een type en een url. Het type is een enum met deze waarden: `superhuman-intern`, `superhuman-gedeeld`, `slack-intern`, `slack-klant`, `jira-board`, `drive`, `offerte`, `omgeving-acc`, `omgeving-prod` en `overig`.
- **Signaal:** iets dat aandacht vraagt. Het type is een enum, bijvoorbeeld `budget-krap`, `geen-uren-deze-week` of `jira-blocker`.

## 5. Schermen

### Home
- Snelkoppelingen naar mijn inbox (Gmail) en mijn to-do-lijst (Superhuman). In een latere fase toont de app mijn open to-do's hier ook (zie fase 4).
- Een lijst met mijn accounts, met per account de projecten en per project een budgetbalk.
- Signalen over al mijn projecten: projecten met meer dan 80% van het budget verbruikt, projecten zonder geschreven uren deze week, en open blockers in Jira.

### Accountpagina
- Naam, AM en contactpersonen.
- Projectkaarten met budgetverbruik en Jira-samenvatting.
- Account-links, zoals gedeelde Superhuman-docs en het Slack-klantkanaal.

### Projectpagina
- **Budget:** budget, verbruik en gefactureerd, in uren en in waarde.
- **Uren:** per taak, per persoon en als trend per week.
- **Offerte:** een link.
- **Jira:** tickets per status, open bugs, tickets op QA en een link naar het board.
- **Links:** Superhuman intern en gedeeld, Slack-kanalen, Drive, en de acc- en prod-omgeving.

## 6. Databronnen

| Bron | Wat | Hoe | Fase |
|:---|:---|:---|:---|
| Config | Accounts, projecten, links | Lokaal configbestand | 1 |
| Jira (Atlassian Cloud) | Tickets per project | REST API v3 met API-token en JQL | 2 |
| Teamleader Orbit | Projecten, budget, uren, offertes | Officiële connector, zie hieronder | 0 en 3 |
| Superhuman Docs (Coda) | To-do-tabel | Coda API met token | 4 |
| Offertes | Offertes per project en account | Officiële Teamleader-connector (`ListOffers`) | 3 |
| Slack, Gmail | Kanalen en inbox | Alleen links (deeplinks) in v1 | 1 |

### Teamleader Orbit
Er zijn twee connectors voor Teamleader Orbit:

- **Officieel, van Teamleader** (`orbit.teamleader`, MCP-server op `api.orbit.teamleader.eu/mcp`): alleen lezen, met een eigen login. Het prototype gebruikt deze voor projecten, budget en offertes.
- **Norday-connector** (`teamleader-mcp.norday.nl`): praat via mijn ingelogde Orbit-sessie met een niet-officiële API. Die sessie kan verlopen. Het prototype gebruikt deze alleen nog voor tijdregels per project.

Welke tools het prototype gebruikt:

| Tool | Connector | Wat het levert |
|:---|:---|:---|
| `ListProjects` (`mine: true`, `states: "OPEN"`) | officieel | Per project: nummer, intern id, naam, klant, eigenaar, status, afrekenwijze, budget, gefactureerd, resterend, einddatum |
| `GetProjectFinancials` (projectnummer) | officieel | Budget, geleverde waarde, gefactureerd, uren totaal, geleverd, gepland en resterend, marge |
| `ListOffers` (`mine: true`) | officieel | Per offerte: nummer, naam, klant, status, dagen in status, waarde, gewogen waarde, vervaldatum, gekoppeld project |
| `get_project_timesheets` (intern id) | Norday | Tijdregels met datum, uren, medewerker en taak |

Aandachtspunten:
- **Platte tekst:** de officiële connector geeft antwoorden als tekst met Markdown-tabellen, niet als JSON. Parse die aan de grens naar getypeerde objecten en vang ontbrekende velden af.
- **Budget op uren:** baseer het budgetpercentage op uren (geleverd gedeeld door totaal). De geleverde waarde rekent met uurtarieven en ligt bij offerteprojecten vaak hoger dan het budget, zonder dat er een overschrijding is.
- **Ids:** het interne project-id is in beide connectors hetzelfde. `GetProjectFinancials` verwacht het projectnummer.

Zoek in fase 0 uit welke route werkt, in deze volgorde:

**Route 1: de app is zelf MCP-client van de officiële connector (voorkeur, zonder AI)**
- De app praat server-side met `api.orbit.teamleader.eu/mcp` via de officiële MCP TypeScript SDK en logt in via de OAuth-flow van die server.
- Uitzoeken: hoe de login werkt buiten claude.ai, en of de tijdregels per medewerker ook via deze connector beschikbaar zijn, bijvoorbeeld via `ListTimeEntries`. Dan is de Norday-connector niet meer nodig.

**Route 2: sync-commando in Claude Code (terugvaloptie, met AI)**
- Maak een Claude Code-commando `/sync-teamleader` dat de connectors in Claude Code gebruikt.
- Het commando schrijft de tool-uitvoer letterlijk weg naar `data/teamleader.json`, met een tijdstempel. Claude mag de cijfers niet herschrijven of samenvatten.
- De app leest dat bestand, controleert het met een parser naar getypeerde objecten en toont wanneer de laatste sync was.
- Starten kan met de hand of via een geplande taak. Bij een fout blijft de laatst bekende stand staan, met een duidelijke melding.
- `data/teamleader.json` bevat budgetten en factuurbedragen en hoort in `.gitignore`.

**Route 3: het prototype gebruiken voor Teamleader (noodoptie)**
- Werken route 1 en 2 allebei niet, dan linkt de app voor budget, uren en offertes naar het prototype.

## 7. Huisstijl en UI

- **Bron:** de Norday-huisstijl komt uit het Figma-bestand "Norday Website" (pagina Handoff, frame Foundation): https://www.figma.com/design/6UtLxRTrvPVvNeJs17vHJH/Norday-Website?node-id=2820-24381
- **Uitgewerkt:** kleuren, typografie, spacing en grid staan in `docs/huisstijl/huisstijl.md`, en als design tokens in `docs/huisstijl/tokens.css`. Neem die tokens over als basis van de stylesheet en verwijs overal naar de custom properties, nooit naar losse hexwaarden.
- **Kleuren:** Dark `#3D1028` is de tekstkleur. Pink, Yellow en Lilac zijn accenten. Pink haalt het WCAG-contrast voor gewone tekst niet, dus gebruik het alleen voor grote tekst, randen en iconen.
- **Lettertypes:** Apercu Condensed Pro Bold voor koppen (hoofdletters, -3%) en Suisse Int'l voor de rest (Regular, Book, Medium, Semi Bold). Gebruik de terugvalfonts uit `tokens.css` tot de bestanden er zijn.
  - **Waar:** ik zet de bestanden in `docs/huisstijl/fonts/`. Kopieer ze naar `public/fonts/` en zet de `@font-face`-regels in `tokens.css` aan, met de echte bestandsnamen.
  - **Licentie:** het zijn betaalde lettertypes. Zet ze niet om naar een ander formaat; gebruik ze zoals het Brand-team ze levert.
  - **Niet in Git:** zet `docs/huisstijl/fonts/` en `public/fonts/` in `.gitignore`, tenzij ik zeg dat de licentie het toestaat. De app draait lokaal, dus de bestanden hoeven alleen op mijn laptop te staan. Laat de app er netjes op terugvallen als ze ontbreken.
- **Logo:** ik zet het logo als SVG in `docs/huisstijl/logo/`, het liefst met een versie voor licht en voor donker en een los beeldmerk. Gebruik het in de app en maak er het favicon van. Het logo mag wel in Git.
- **Dashboard, geen website:** gebruik de kleinere tekststijlen en compactere marges. De websitematen zijn voor een marketingsite.
- **Knoppen, links en kaarten:** die staan in het frame "Partials" van hetzelfde Figma-bestand. Als de Figma-connector in Claude Code beschikbaar is, haal je ze daar op.
- **UI-referentie:** de basis voor alle schermen is [Intelly HealthCare App Dashboard](https://dribbble.com/shots/23902200-Intelly-HealthCare-App-Dashboard). Neem de vormtaal over, houd de Norday-kleuren en -fonts. Bekijk die voordat je de schermen opbouwt.
- **Status en toegankelijkheid:** status nooit alleen met kleur tonen, maar ook met tekst of een icoon. WCAG 2.2 AA.
- **Responsief en thema:** het dashboard werkt ook op een smal scherm. Lichte en donkere modus staan in de tokens.

## 8. Fasering

| Fase | Doel | Klaar als |
|:---|:---|:---|
| 0. Opzet en uitzoeken | Repository, Next.js-skelet, `.env.example` en de keuze tussen Orbit-route 1, 2 of 3 | De app start lokaal en de gekozen Orbit-route levert voor één project echte data op |
| 1. Skelet met links | Home, accountpagina's en projectpagina's op basis van de config, nog zonder live data | Ik kan van home naar elk project klikken en alle links werken |
| 2. Jira live | Jira-blokken op project- en accountpagina | Echte aantallen per status, met tijdstip van ophalen |
| 3. Orbit live | Budget- en urenblokken | Budget, verbruik en uren kloppen met Orbit voor twee steekproefprojecten |
| 4. To-do's en signalen | To-do's uit Superhuman op home, plus signalen | Signalen verschijnen op basis van echte data |
| Later | Kansenblok per account, configscherm, delen met collega's, hosting met login | Plannen we apart |

## 9. Startlijst accounts

Accounts en projecten komen automatisch uit Teamleader Orbit. Het gaat om alle open projecten waar "Lennart Ter Haar" eigenaar is, gegroepeerd per klant. Ik kan daar zelf projecten aan toevoegen of projecten verbergen.

Er is al een werkend prototype als gepubliceerde Claude-pagina: https://claude.ai/artifact/3z7QteomaWMjj7ie9kZyFm. De broncode staat in `docs/prototype/pm-dashboard.html` en mijn instellingen (accounts, Jira-keys, links) in `docs/prototype/instellingen.json`. Gebruik die als specificatie voor functionaliteit, datamodel, parsers en signaalregels, en neem de instellingen over. De code zelf kun je niet één op één overnemen: het prototype haalt data op via `claude.use("mcp")`, en dat bestaat alleen binnen claude.ai. Wat het prototype heeft laten zien:

- **Teamleader:** de Norday-connector (`get_projects_overview`) geeft per project id, naam, klant, eigenaar, budget in uren en waarde, verbruik en gefactureerd. Het verbruik stopt bij 100%. `get_project_timesheets` geeft per projectId losse tijdregels met datum, uren, medewerker en taak.
- **Beheer & Support (Jira-project SUPP):** de klant staat in het veld Organizations (`customfield_10700`). De SLA-reactietermijn staat in `customfield_11521.ongoingCycle.breached`. Supporttickets horen bij het SLA-project van het account.
- **Slack:** bewaarde berichten zijn op te halen via de zoekfilter `is:saved`. Slack heeft daar geen API voor afvinken of verwijderen.

## 10. Wat je mij als eerste vraagt

- Of de norday-engineering-plugin geïnstalleerd is.
- Of de repository onder mijn eigen GitHub-account of onder de Norday-organisatie komt.
- Of ik de officiële Teamleader-connector buiten claude.ai kan gebruiken, en hoe de login daar werkt (fase 0, route 1).

## 11. Backlog

Deze ideeën bouwen we pas na fase 4, en elk idee krijgt eerst een korte spec.

### Eerst: to-do's migreren (hoge prioriteit)
Mijn to-do's staan voortaan in de tabel "To-do's" op de pagina "To-do's" in mijn Superhuman-doc "Lenny's Dashboard" (`superhuman://docs/bn7xvJsaKk/pages/section-lCGI2ra91w/tables/grid-Fj07UGmlob`). Er is een bordweergave per status (Inbox, To do, Bezig, Wacht op, Klaar) en een lijstweergave.
- Migreer de open items uit de oude tabellen onder "Actiepunten Dashboard" in hetzelfde doc naar de nieuwe tabel.
- Laat de oude tabellen staan tot ik de migratie heb gecontroleerd.
- Het dashboard maakt to-do's aan vanuit signalen. De kolom "Bron-id" voorkomt dat hetzelfde signaal twee keer binnenkomt.

### Bewaarde Slack-berichten als to-do-lijst
Ik gebruik bewaarde berichten in Slack als reminder- en to-do-lijst. Ze komen in de Inbox-kolom van mijn to-do-tabel in Superhuman.

- **Per bericht:** Claude bepaalt bij welk account of project het hoort (via het kanaal of genoemde namen) en vat in één regel samen wat er van mij verwacht wordt.
- **Ouderdom:** het dashboard toont hoe lang een bericht al bewaard staat en markeert berichten die blijven liggen.
- **Afgehandeld:** omdat Slack geen API heeft om een bericht als klaar te markeren, houdt het dashboard zelf bij wat ik heb afgehandeld. Ik vink het daarna nog in Slack af.
- **Doorzetten:** ik kan een bericht omzetten naar een Jira-ticket of een taak voor een teamlid, altijd pas na mijn akkoord.

### Inkoopfacturen in Slack
- Monitor het Slack-kanaal met inkoopfacturen en toon berichten die bij mijn accounts of projecten horen. Herken die op klant- en projectnamen uit Teamleader.
- **Openstaande vraag:** wat is de naam van het kanaal?

### Meetings per account
- Toon per account de komende en eerdere afspraken uit Google Agenda. Koppel ze via de e-maildomeinen van deelnemers en de titel van de afspraak.
- Zet bij elke afspraak een link naar het gespreksverslag.
- **Openstaande vraag:** waar staan de verslagen, in Plaud, Superhuman of allebei?

### Gespreksverslagen via Plaud
- Houd nieuwe Plaud-opnames actief in de gaten en maak automatisch een conceptverslag dat ik zelf controleer en verstuur.
- Elk verslag krijgt een vast kopje "Kans?", zodat commerciële signalen naar de AM kunnen.
- Actief monitoren vraagt een geplande taak (Cowork of Claude Code), omdat het dashboard alleen werkt als het openstaat.

### Losse eindjes in Beheer & Support
Signaleer supporttickets die blijven liggen:
- tickets die X dagen niet zijn bijgewerkt
- tickets zonder uitvoerder
- tickets die lang op support wachten
- tickets die in meerdere supportweek-labels terugkomen

Het doel is dat het eigenaarschap in het team komt te liggen. Het overzicht moet dus ook bruikbaar zijn voor wie die week support draait, niet alleen voor mij.

### Opnieuw ophalen ook voor Jira zichtbaar
- De knop "Alles opnieuw ophalen" leegt al de cache van Orbit én Jira, maar ernaast staat alleen hoe laat de Orbit-data is opgehaald. Daardoor lijkt het een Orbit-knop.
- Toon ook wanneer de Jira-data is opgehaald, of maak de status bronneutraal, zodat duidelijk is dat de knop alles ververst.

### Sprintrapporten en supportweek-rapporten
- Rapportages per sprint en per supportweek, op basis van Jira (projectborden en SUPP met de supportweek-labels) en de uren uit Teamleader.
- **Openstaande vraag:** wat ze precies moeten bevatten en voor wie ze zijn (intern, klant of allebei). Dit bepalen we later.

## 12. PM-functies (besloten)

Deze functies sluiten aan op mijn PM-profiel en de CS-visie. Het dashboard helpt mij te signaleren en te beleggen, niet om zelf uitvoerend werk te doen.

### Goedgekeurd
**Signaal voor uitvoerend werk op mijn naam**
- **Wanneer:** een Jira-ticket staat langer dan drie werkdagen op mijn naam in een werkstatus, zoals "Dev | To Do", "VO | To Do", "IO | To Do" of Blocked. Statussen als "Tested" en "Acceptance | Client" zijn PM-werk en tellen niet mee.
- **Op mijn lijst:** in "Op mijn naam in Jira" staat per ticket of het in een werkstatus of een PM-status staat.
- **Suggestie:** het dashboard stelt voor wie het kan oppakken. Dat is wie de afgelopen weken uren schreef op dat project (Teamleader), in het team dat past bij de status: Dev naar development, VO en IO naar design.

**Kansen per account**
- **Kansenblok:** een kans in één zin, met afvinkpunten: gedeeld met het team, gedeeld met de AM, Opportunity Flash in #client-services, vastgelegd in Teamleader.
- **Signaal:** een kans die na twee weken niet verder is dan "vastgelegd", komt op de homepage.
- **Aflopende SLA's:** voor SLA-projecten van het lopende jaar vraagt het dashboard vanaf oktober per account of de verlenging al met de AM is besproken.

**Retro's**
- **Wanneer:** een project komt boven 90% budget of wordt in Teamleader afgesloten. Dan verschijnt een signaal "Plan de retro".
- **Vaste opzet:** wat ging goed en wat kan beter, met elke les als concrete verbetering met een eigenaar.
- **Commercieel deel:** doorontwikkeling en kansen. Die gaan naar het kansenblok van het account.
- **AM en klant:** de AM is erbij of krijgt achteraf een briefing, en er is een logische volgende stap voor de klant.

**Reflectielogboek**
- Een link op de homepage. Het adres stel ik in bij Instellingen.

### Later uitdenken
**Escalatiecheck bij een budgetsignaal**
- Drie vragen: raakt het de commerciële koers, de klantrelatie op langere termijn, of is de impact meer dan 20%? Alleen bij een ja zet ik het door naar de AM, en dan met een voorstel.
- Mogelijk met de echte overschrijding, berekend uit de urenregels in Teamleader.

### Niet doen
- Kaarttype "scopevraag" op het kanbanbord.
- Een gedeelde supportweek-pagina voor het team.
- Signaal voor het laatste klantcontact per account.
