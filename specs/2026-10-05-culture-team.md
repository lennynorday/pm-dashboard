# Dashboard voor het Culture-team

`2026-10-05` · Lennart ter Haar · TODO: PR-link

## Waarom

- Nu zie ik alleen accounts waar ik projecteigenaar ben. Neemt een collega waar, of vraagt iemand naar een ander Culture-account, dan moet ik naar Orbit en Jira.
- Het AM/PM-team van Culture kan later hetzelfde overzicht gebruiken. Daarom richten we het nu zo in dat elke gebruiker met de eigen Orbit- en Jira-rechten werkt.
- Accountgegevens (Jira-keys, SUPP-organisaties, links) staan nu in code. Voor tientallen accounts is een bewerkscherm nodig.
- Doen we niets, dan blijft het een persoonlijke tool die het team niet kan overnemen.

## Scope

- **Wel:** alle open projecten uit de Orbit-projectmap "Norday | Culture"; zijmenu met "Mijn accounts" en "Overige Culture-accounts"; inloggen bij Jira met OAuth in plaats van een API-token; tokens, cache en voorkeuren per gebruiker; bewerkscherm voor accountgegevens; één SQLite-database in `data/` voor accountgegevens, tokens en voorkeuren. Gebouwd in drie stappen, elk een eigen PR.
- **Niet:** hosting en inloggen met Google (aparte spec), andere Norday-teams, rechten binnen de app (wie mag wat bewerken), Superhuman-login.

## Acceptatiecriteria

**Stap A: alle Culture-accounts**

1. De app haalt alle open projecten uit de projectmap "Norday | Culture" op, naast mijn eigen open projecten.
2. Het zijmenu heeft twee groepen: "Mijn accounts" (accounts met minstens één open project waar ik eigenaar van ben, ook buiten de Culture-map) en "Overige Culture-accounts". Een account staat maar in één groep.
3. "Overige Culture-accounts" is standaard ingeklapt; de stand blijft bewaard na herladen.
4. Elk Culture-account heeft dezelfde accountpagina. Budget en uren worden pas opgehaald als ik het account open.
5. Een account zonder Jira-keys of SUPP-organisatie toont projecten en budget, en in het Jira-blok de melding dat er nog geen Jira-gegevens zijn ingesteld.

**Stap B: inloggen per gebruiker**

6. "Verbinden met Jira" stuurt mij naar Atlassian; na toestemming haalt de app Jira-data op met mijn eigen rechten. `JIRA_EMAIL` en `JIRA_API_TOKEN` zijn verdwenen uit `.env.example`.
7. De app vraagt bij Jira alleen leesrechten.
8. Orbit- en Jira-tokens worden per gebruiker opgeslagen, versleuteld, en nooit naar de browser gestuurd.
9. De cache van Orbit en Jira is per gebruiker: data die voor de ene gebruiker is opgehaald, krijgt een andere gebruiker nooit te zien.
10. Verborgen projecten en menustand zijn per gebruiker.
11. Is een koppeling verlopen of ingetrokken, dan toont het blok "Opnieuw verbinden met Orbit" of "Opnieuw verbinden met Jira"; de rest van de pagina werkt door.

**Stap C: bewerkscherm**

12. Op elke accountpagina staat een knop "Gegevens bewerken" voor AM, contactpersonen, Jira-keys, SUPP-organisaties en links.
13. Na opslaan zie ik de wijziging direct op de accountpagina, zonder de app te herstarten.
14. De gegevens uit `config/accounts.ts` zijn overgezet; daarna bestaat dat bestand niet meer.
15. Het formulier voldoet aan WCAG 2.2 AA: labels bij elk veld, foutmeldingen bij het veld en in tekst.
16. "Gegevens exporteren" geeft alle accountgegevens als JSON-bestand; "Gegevens importeren" leest zo'n bestand weer in. Zo verhuizen ze mee naar hosting en kan ik een back-up maken.

## Domeinmodel

- **Culture-account:** een klant met minstens één open project in de projectmap "Norday | Culture".
- **Mijn account:** een account met minstens één open project waar de ingelogde gebruiker eigenaar van is, ook buiten de Culture-map.
- **Gebruiker:** wie Orbit heeft verbonden; herkend aan het Orbit-gebruikers-id.
- **Koppeling:** de verbinding van een gebruiker met Orbit of Jira; heeft de status verbonden, verlopen of niet verbonden.
- **Accountgegevens:** wat Orbit niet weet (AM, contactpersonen, Jira-keys, SUPP-organisaties, links); gedeeld door alle gebruikers.
