# Fase 2: Jira live

`2026-10-04` · Lennart ter Haar · roadmap #8

## Waarom

- Ik wil per project en per account in één oogopslag zien hoe het in Jira staat, zonder elk board apart te openen.
- Supporttickets uit SUPP horen bij het account; nu zie ik ze alleen als ik in Beheer & Support filter.
- Deze cijfers zijn de basis voor de signalen in fase 4, zoals open blockers.

## Scope

- **Wel:** Jira REST API v3 met mijn API-token, alleen server-side; per projectbord het aantal open tickets per status, open bugs en tickets op QA; per account de som van de projectborden plus open supporttickets in SUPP via Organizations; cache van 15 minuten, "Verversen" en tijdstip van ophalen; foutmelding per blok.
- **Niet:** ticketlijsten of ticketdetails, signalen (fase 4), SLA-termijnen (`customfield_11521`), tickets op mijn naam (roadmap #18), schrijven naar Jira.

## Acceptatiecriteria

1. Het Jira-token staat alleen in `.env.local`; `.env.example` bevat `JIRA_BASE_URL`, `JIRA_EMAIL` en `JIRA_API_TOKEN` zonder waarden; geen token in de browser of in Git.
2. De Jira-key staat per account in de config en geldt voor alle projecten van dat account; per project kan ik hem overschrijven of leegmaken.
3. Het Jira-blok op de projectpagina toont het aantal open tickets per status (zoals Jira de status noemt), gesorteerd van "nog te doen" naar "bijna klaar".
4. Het blok toont apart: open bugs (type Bug) en tickets op QA (status "Norday | QA" of "Klant | Acceptatietest"); de QA-statussen staan in de config.
5. Elk aantal is een link naar dezelfde selectie in Jira; daarnaast een link naar het board.
6. De accountpagina toont dezelfde samenvatting per Jira-project van het account, plus het aantal open supporttickets in SUPP voor de Organization van het account.
7. Een open "Blocked"-status valt op met tekst of icoon, niet alleen met kleur.
8. Elk Jira-blok toont wanneer de data is opgehaald; de cache duurt 15 minuten en "Verversen" haalt Orbit en Jira opnieuw op.
9. Ontbreekt het token, faalt Jira of is de key onbekend, dan toont alleen dat blok een duidelijke melding; de rest van de pagina werkt.
10. De aantallen kloppen met Jira voor CMU en KH (steekproef met dezelfde JQL in Jira).

## Domeinmodel

- **JiraOverzicht:** per Jira-project: aantallen per status, open bugs, tickets op QA, link naar het board, tijdstip van ophalen.
- **SupportOverzicht:** per account: aantal open SUPP-tickets voor de Organization(s) van het account.
- **Koppeling:** CMU → CMU, Kunsthal → KH, Effenaar → EF, Boijmans → BOIJ, NEMO → NMO, Westerbork → WESTERBORK, WO2Net → OVDR, Norday → geen. Organizations: Effenaar, Boijmans, NEMO Science Museum, Westerbork Corporate, Oorlog voor de Rechter.

## Open vragen

- Boijmans: BOIJ of BMCOLGEB ("Boijmans Collectiegebouw")?
- Organization-namen van CMU en Kunsthal in SUPP: nog geen tickets; opzoeken zodra het token werkt.
