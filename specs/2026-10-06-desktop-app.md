# Desktop-app als .dmg

> Vervallen per PR #64: de desktop-app is weg, het dashboard draait via `npm run serve` op http://localhost:3999.

`2026-10-06` · Lennart ter Haar

## Waarom

- Het dashboard draait nu alleen via `npm run dev`; dat is te technisch voor niet-technische collega's.
- Hosten willen we niet: data, tokens en de server blijven op de eigen Mac.
- Een `.dmg` die je deelt en die zonder setup werkt, maakt het dashboard bruikbaar voor collega's zonder terminal.

## Scope

- **Wel:** Electron-schil die de Next-server lokaal start en in een eigen venster toont.
- **Wel:** `npm run dmg` bouwt een `.dmg` voor macOS (Apple Silicon).
- **Wel:** database en versleutelingssleutel per gebruiker in `~/Library/Application Support/PM Dashboard`.
- **Niet:** ondertekenen en notariseren; collega's openen de app eenmalig via _Systeeminstellingen → Privacy en beveiliging → Toch openen_.
- **Niet:** automatische updates; een nieuwe versie is een nieuwe `.dmg`.
- **Niet:** Windows of Intel-Macs.

## Acceptatiecriteria

1. `npm run dmg` levert een `.dmg` op zonder handmatige stappen.
2. Op een Mac zonder Node, zonder repo en zonder `.env.local` start de app na "Toch openen" en toont het inlogscherm.
3. De app draait op poort `3999`, zodat hij naast `npm run dev` (poort `3000`) kan draaien.
4. Inloggen met Google en verbinden met Jira en Orbit werkt vanuit de app; de redirect-URL's volgen de poort van de server in plaats van hard `localhost:3000`.
5. De database staat in `~/Library/Application Support/PM Dashboard`, niet in de app-bundel.
6. Bij de eerste start wordt een unieke `TOKEN_ENCRYPTION_KEY` aangemaakt en daar bewaard; volgende starts gebruiken dezelfde sleutel.
7. Na afsluiten en opnieuw openen ben je nog ingelogd en zijn je gegevens er nog.
8. Bij het sluiten van het venster stopt ook de Next-server; poort 3999 is daarna vrij.
9. Is poort 3999 al bezet, dan toont de app een duidelijke melding in plaats van een leeg venster.
10. `npm run dev` werkt ongewijzigd op poort `3000` en gebruikt eigen data in `./data`, los van de geïnstalleerde app.

## Open vragen

- Redirect-URL's voor poort `3999` registreren bij Google, Jira en Orbit (handmatig, in hun consoles).
- De client-secrets van Google en Jira zitten ingebakken in de `.dmg`; is "alleen intern delen" voldoende, of moeten ze er per gebruiker in?
- Waar delen we de `.dmg` (Drive, Slack) en wie bouwt nieuwe versies?
