# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Eén gebruiker: Lennart ter Haar (Lenny), projectmanager in het Client Services-team van Norday. Het dashboard staat de hele dag open in een tabblad; hij kijkt er tussendoor steeds even op en klikt door naar Jira, Orbit, Slack en Superhuman. Later misschien andere PM's, maar daar wordt nu niet op gebouwd.

## Product Purpose

Eén plek waar Lenny per klant (account) en per project ziet hoe het ervoor staat, met de links die hij dagelijks nodig heeft. De homepagina vertelt in de eerste seconden waar actie nodig is over alle accounts heen; de stand per account komt daarna. Het dashboard helpt hem te signaleren en te beleggen, niet om zelf uitvoerend werk te doen.

## Positioning

Een persoonlijk werkoverzicht dat Orbit, Jira en Beheer & Support (SUPP) samenbrengt rond zijn eigen accounts, met signalen in plaats van rapporten.

## Operating Context

- Draait lokaal op zijn laptop (`localhost`), zonder hosting of login.
- Accounts en projecten komen live uit Teamleader Orbit (open projecten waar hij eigenaar van is), Jira-aantallen en supporttickets live uit Jira. Externe data heeft een cache van 15 minuten met een knop "Verversen", en toont altijd wanneer die is opgehaald.
- Valt een bron uit, dan werkt de rest door met per blok een melding.
- Projecten kun je verbergen en terugzetten.

## Capabilities and Constraints

- Nu beschikbaar: projecten per account (Orbit), Jira per project-key (actieve sprint, gepland, backlog, lopende sprints met einddatum), open supporttickets per status (SUPP), links per account uit de config. Alleen een licht thema; dark mode is bewust geschrapt om op een werkende tool te focussen.
- Nog niet beschikbaar (fase 3 en 4): budget, uren, offertes, to-do's en de signalen uit de briefing (budget-krap, geen-uren-deze-week, jira-blocker). Ontwerpen mogen er ruimte voor laten maar tonen geen verzonnen cijfers.
- Next.js App Router, TypeScript, CSS Modules. Geen Tailwind.
- Alle UI-teksten in het Nederlands, zonder em-dashes.

## Brand Commitments

- Norday-huisstijl (`docs/huisstijl/huisstijl.md`, `docs/huisstijl/tokens.css`): Dark `#3D1028`, Pink `#FF0D4A`, Yellow `#FFF355`, Lilac `#D5B3FF`, White.
- Apercu Condensed Pro Bold voor koppen (hoofdletters, -3%), Suisse Int'l voor de rest. De fontbestanden ontbreken nog; terugvalfonts uit de tokens tot ze er zijn.
- Pink haalt 4,5:1 niet voor gewone tekst: alleen voor grote tekst, randen, iconen en statusaccenten.
- Dashboard, geen website: kleinere tekststijlen en compactere marges dan de marketingsite. Het moet niet als website voelen.

## Evidence on Hand

- Live data uit Orbit en Jira op `localhost:3000`.
- UI-inspiratie in `docs/inspiratie/` (vier dashboardshots, generieke SaaS-stijl).
- Er is nog geen logo-bestand; niet verzinnen.

## Product Principles

- Actie eerst: wat aandacht vraagt staat bovenaan, de rest is naslag.
- Altijd open, dus rustig: het scherm moet de hele dag aan kunnen staan zonder te schreeuwen.
- Elke cijfer linkt door naar de bron waar je er iets mee doet.
- Eerlijk over versheid en fouten: altijd tonen wanneer data is opgehaald en wat er misging.

## Accessibility & Inclusion

WCAG 2.2 AA. Status nooit alleen met kleur, maar ook met tekst of icoon. Werkt op een smal scherm.
