# PM-dashboard

Lokaal dashboard voor projectmanagement bij Norday: per account en project budget, uren, Jira-status en links. Zie `BRIEFING.md`.

## Starten

```bash
npm install
npm run dev
```

Open daarna http://localhost:3000.

Geheimen staan in `.env.local` (niet in Git). Zie `.env.example` voor de namen.

## Vaste server

`npm run build` en daarna `npm run serve` draaien het dashboard op http://localhost:3999 (alleen bereikbaar vanaf je eigen Mac), naast `npm run dev` op 3000. Na een wijziging opnieuw bouwen en de server herstarten.
