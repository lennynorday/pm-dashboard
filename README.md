# PM-dashboard

Lokaal dashboard voor projectmanagement bij Norday: per account en project budget, uren, Jira-status en links. Zie `BRIEFING.md`.

## Starten

```bash
npm install
npm run dev
```

Open daarna http://localhost:3000.

Geheimen staan in `.env.local` (niet in Git). Zie `.env.example` voor de namen.

## Desktop-app

`npm run dmg` bouwt `dist/PM Dashboard-<versie>-arm64.dmg` voor Macs met Apple Silicon. De secrets uit je `.env.local` gaan mee in de app; deel de .dmg dus alleen intern. De versleutelingssleutel en de database maakt de app per gebruiker aan in `~/Library/Application Support/PM Dashboard`.

De app draait op poort 3999, zodat hij naast `npm run dev` kan draaien. Hij is niet ondertekend: open hem de eerste keer, klik de melding weg en kies dan _Systeeminstellingen → Privacy en beveiliging → Toch openen_.
