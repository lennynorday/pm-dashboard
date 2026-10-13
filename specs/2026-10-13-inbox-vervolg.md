# Inbox: één item per DM-gesprek, namen en opruimen

`2026-10-13` · Lennart ter Haar · TODO Jira-ticket

## Waarom

- De eerste versie van de Inbox ([inbox-en-todos](2026-10-12-inbox-en-todos.md), PR #61) maakt bij elk nieuw bericht in een lopend DM-gesprek een nieuw item en ruimt niets op. Eén gesprek kan zo meerdere items opleveren die blijven staan nadat je al hebt gereageerd.
- Afzenders staan als Slack-gebruikersnaam (`sanne.devries`) en @-namen in de tekst als "@gebruiker". Dat leest slecht en maakt het lastig te zien wie wat vraagt.
- Dit zijn de eindjes die uit gebruik tot nu toe zijn gebleken. Verdere feedback tijdens gebruik komt hier of in een volgende spec bij.

## Scope

- **Wel:** één Inbox-item per DM-gesprek, bijgewerkt met het laatste bericht (tekst, afzender, tijd, link).
- **Wel:** een DM-item verdwijnt uit de Inbox zodra jij in dat gesprek reageert.
- **Wel:** volledige namen voor afzenders en voor @-vermeldingen in de berichttekst (`users:read`, namen lokaal bewaard).
- **Wel:** controleren of de extra scopes `im:read`, `im:history`, `mpim:read` en `mpim:history` nodig zijn voor het zoeken, en ze anders weghalen.
- **Wel:** een Jira-story in project PM aanmaken en de link in de specs zetten.
- **Niet:** Gmail (eigen spec, vraagt eerst een besluit over de Google-OAuth-instelling), thread-antwoorden, kanaalberichten, antwoorden vanuit het dashboard.
- **Niet:** vermeldingen automatisch opruimen als je reageert; die blijven tot je kiest.

## Acceptatiecriteria

1. Stuurt iemand meerdere berichten in een DM terwijl het item nog in de Inbox staat, dan blijft er één item, met het laatste bericht en de nieuwste tijd.
2. Reageer je zelf in dat gesprek, dan staat het item bij de volgende synchronisatie niet meer in de Inbox. Staat het al op To-do's, dan blijft het daar staan.
3. Een DM-item staat niet dubbel in de Inbox, ook niet als hetzelfde gesprek ook een vermelding bevat.
4. De afzender staat als volledige naam, ook bij groepsgesprekken en bij taken op To-do's.
5. @-vermeldingen in de berichttekst tonen de naam van die persoon; een onbekende gebruiker toont "@onbekend", geen id.
6. Namen worden per gebruiker één keer opgehaald en bewaard; een synchronisatie doet geen aanroep per bericht.
7. Na het wijzigen van de scopes werkt Slack voor bestaande gebruikers, of de pagina toont "Opnieuw verbinden", geen foutpagina.
8. Beide Slack-specs verwijzen naar het Jira-ticket.

## Domeinmodel

Een DM-item hoort bij een gesprek (kanaal-id), niet bij één bericht. De sleutel in `taken` is daarom het gesprek, en `url`, `bericht` en `tijd` verwijzen naar het laatste bericht. Vermeldingen en bewaarde berichten blijven per bericht.

## Open vragen

- Komt er een nieuw Inbox-item als er een bericht binnenkomt in een gesprek waarvan het item al is genegeerd of op To-do's staat? TODO besluit Lenny; voorstel: ja bij genegeerd (het gesprek vraagt weer iets), nee bij To-do's (staat al op je lijst).
- Hoe vaak ververs je namen (bijvoorbeeld eens per dag) en wat als iemand van naam verandert? TODO.
- Zijn de DM-scopes echt overbodig? Eerst testen met een nieuwe verbinding met alleen `search:read`.
