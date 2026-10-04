# Fase 2: Jira live

`2026-10-04` · Lennart ter Haar · roadmap #8

## Waarom

- Ik wil per project en per account in één oogopslag zien hoe het in Jira staat, zonder elk board apart te openen.
- Supporttickets uit SUPP horen bij het account; nu zie ik ze alleen als ik in Beheer & Support filter.
- Deze cijfers zijn de basis voor de signalen in fase 4, zoals open blockers.

## Scope

- **Wel:** Jira REST API v3 met mijn API-token, alleen server-side; per projectbord het aantal open tickets in de actieve sprint, gepland en backlog, met de naam en einddatum van de actieve sprint; per account de som van de projectborden plus open supporttickets in SUPP via Organizations; cache van 15 minuten, "Verversen" en tijdstip van ophalen; foutmelding per blok.
- **Niet:** aantallen per status, open bugs en tickets op QA (bewust weggelaten voor eenvoud), ticketlijsten of ticketdetails, signalen (fase 4), SLA-termijnen (`customfield_11521`), tickets op mijn naam (roadmap #18), schrijven naar Jira.

## Acceptatiecriteria

1. Het Jira-token staat alleen in `.env.local`; `.env.example` bevat `JIRA_BASE_URL`, `JIRA_EMAIL` en `JIRA_API_TOKEN` zonder waarden; geen token in de browser of in Git.
2. De Jira-key staat per account in de config en geldt voor alle projecten van dat account; per project kan ik hem overschrijven of leegmaken.
3. Het Jira-blok op de projectpagina toont drie tegels: **Actieve sprint** (in een lopende sprint), **Gepland** (alleen in toekomstige sprints) en **Backlog** (de rest, ook tickets uit afgesloten sprints). Elk open ticket valt in precies één tegel.
4. De indeling volgt Jira's eigen zoekopdrachten (`openSprints()` en `futureSprints()`). Actieve sprint linkt naar het board, Gepland en Backlog naar de backlogpagina van het project (Jira heeft geen ankers per onderdeel); zonder board linkt een tegel naar dezelfde selectie als zoekopdracht.
5. Boven de tegels staan de naam en einddatum van de actieve sprint, of "Geen actieve sprint"; is de einddatum verstreken, dan staat er een melding.
6. De accountpagina toont dezelfde tegels per Jira-project van het account, plus het aantal open supporttickets in SUPP voor de Organization van het account, met daaronder het aantal per status.
7. Elk Jira-blok toont wanneer de data is opgehaald en linkt naar het board; de cache duurt 15 minuten en "Verversen" haalt Orbit en Jira opnieuw op.
8. Ontbreekt het token, faalt Jira of is de key onbekend, dan toont alleen dat blok een melding; de rest van de pagina werkt.
9. Alle meldingen gebruiken hetzelfde onderdeel: een gele kaart in de huisstijl met icoon, titel, korte uitleg en zo nodig een actie.
10. De aantallen kloppen met Jira voor CMU en KH (steekproef met dezelfde JQL in Jira).

## Domeinmodel

- **JiraOverzicht:** per Jira-project: aantallen per sprintbak, actieve sprint(s), link naar het board, tijdstip van ophalen.
- **Sprintbak:** `actief`, `gepland` of `backlog`; elk open ticket valt in precies één bak.
- **SupportOverzicht:** per account: aantal open SUPP-tickets voor de Organization(s) van het account.
- **Koppeling:** CMU → CMU, Kunsthal → KH, Effenaar → EF, Boijmans → BOIJ, NEMO → NMO, Westerbork → WESTERBORK, WO2Net → OVDR, Norday → geen. Organizations: Effenaar, Boijmans, NEMO Science Museum, Westerbork Corporate, Oorlog voor de Rechter.

## Open vragen

- Boijmans: BOIJ of BMCOLGEB ("Boijmans Collectiegebouw")?
- Organization-namen van CMU en Kunsthal in SUPP: nog geen tickets; opzoeken zodra het token werkt.
