# Dashboard voor het Culture-team

`2026-10-05` · Lennart ter Haar · TODO: PR-link

## Waarom

- Nu zie ik alleen accounts waar ik projecteigenaar ben. Neemt een collega waar, of vraagt iemand naar een ander Culture-account, dan moet ik naar Orbit en Jira.
- Het AM/PM-team van Culture kan later hetzelfde overzicht gebruiken. Daarom richten we het nu zo in dat elke gebruiker met de eigen Orbit- en Jira-rechten werkt.
- Accountgegevens (Jira-keys, SUPP-organisaties, links) staan nu in code. Voor tientallen accounts is een bewerkscherm nodig.
- Doen we niets, dan blijft het een persoonlijke tool die het team niet kan overnemen.

## Scope

- **Wel:** alle open projecten uit de Orbit-projectmap "Norday | Culture"; zijmenu met "Mijn accounts" en "Overige Culture-accounts"; inloggen met het Norday Google-account; inloggen bij Jira met OAuth in plaats van een API-token; tokens, cache en voorkeuren per gebruiker; bewerkscherm voor accountgegevens; één SQLite-database in `data/` voor accountgegevens, tokens en voorkeuren. Gebouwd in stappen A, B1, B2 en C, elk een eigen PR.
- **Niet:** hosting (aparte spec), andere Norday-teams, rechten binnen de app (wie mag wat bewerken), Superhuman-login.

## Acceptatiecriteria

**Stap A: alle Culture-accounts**

1. De app haalt alle open projecten uit de projectmap "Norday | Culture" op, naast mijn eigen open projecten.
2. Het zijmenu heeft twee groepen: "Mijn accounts" (accounts met minstens één open project waar ik eigenaar van ben, ook buiten de Culture-map) en "Overige Culture-accounts". Een account staat maar in één groep.
3. "Overige Culture-accounts" is standaard ingeklapt; de stand blijft bewaard na herladen.
4. Elk Culture-account heeft dezelfde accountpagina. Budget en uren worden pas opgehaald als ik het account open.
5. Een account zonder Jira-keys of SUPP-organisatie toont projecten en budget, en in het Jira-blok de melding dat er nog geen Jira-gegevens zijn ingesteld.

**Stap B1: inloggen met Google**

6. Zonder sessie stuurt elke pagina mij naar "Inloggen met Google". Alleen accounts op `norday.nl` komen erin; anders zie ik een duidelijke melding.
7. Na inloggen staan linksboven in het zijmenu mijn Google-profielfoto en "Welkom terug, <voornaam>!". Ingeklapt staat alleen de foto er, met mijn naam als tooltip en toegankelijke naam.
8. Ik blijf ingelogd na herladen en na een herstart van de app, tot ik op "Uitloggen" klik.
9. Mijn Orbit-token wordt per gebruiker opgeslagen, versleuteld, en nooit naar de browser gestuurd. `data/orbit-token.json` bestaat niet meer.
10. De Orbit-cache is per gebruiker: data die voor de ene gebruiker is opgehaald, krijgt een andere gebruiker nooit te zien.
11. Verborgen projecten zijn per gebruiker.
12. Is Orbit niet verbonden, of is de koppeling verlopen of ingetrokken, dan staat er "Verbinden met Orbit"; de rest van de pagina werkt door.

**Stap B2: verbinden met Jira**

13. "Verbinden met Jira" stuurt mij naar Atlassian; na toestemming haalt de app Jira-data op met mijn eigen rechten. `JIRA_EMAIL` en `JIRA_API_TOKEN` zijn verdwenen uit `.env.example`.
14. De app vraagt bij Jira alleen leesrechten.
15. Jira-tokens en de Jira-cache zijn per gebruiker, net als bij Orbit (criteria 9 en 10).
16. Is de Jira-koppeling verlopen of ingetrokken, dan staat er in het Jira-blok "Opnieuw verbinden met Jira"; de rest van de pagina werkt door.

**Stap C: bewerkscherm**

17. Op elke accountpagina staat een knop "Gegevens bewerken" voor AM, contactpersonen, Jira-keys, SUPP-organisaties en links.
18. Na opslaan zie ik de wijziging direct op de accountpagina, zonder de app te herstarten.
19. De gegevens uit `config/accounts.ts` zijn overgezet; daarna bestaat dat bestand niet meer.
20. Het formulier voldoet aan WCAG 2.2 AA: labels bij elk veld, foutmeldingen bij het veld en in tekst.
21. "Gegevens exporteren" geeft alle accountgegevens als JSON-bestand; "Gegevens importeren" leest zo'n bestand weer in. Zo verhuizen ze mee naar hosting en kan ik een back-up maken.

## Domeinmodel

- **Culture-account:** een klant met minstens één open project in de projectmap "Norday | Culture".
- **Mijn account:** een account met minstens één open project waar de ingelogde gebruiker eigenaar van is, ook buiten de Culture-map.
- **Gebruiker:** een Norday-collega, herkend aan het Google-account (e-mailadres); heeft een naam en profielfoto.
- **Sessie:** het bewijs dat een gebruiker in deze browser is ingelogd; eindigt bij uitloggen.
- **Koppeling:** de verbinding van een gebruiker met Orbit of Jira; heeft de status verbonden, verlopen of niet verbonden.
- **Accountgegevens:** wat Orbit niet weet (AM, contactpersonen, Jira-keys, SUPP-organisaties, links); gedeeld door alle gebruikers.
