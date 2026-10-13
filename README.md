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

## Staging en productie

`npm run dev` (3000) is staging en gebruikt `data/staging.db`; `npm run serve` (3999) is productie en gebruikt `data/dashboard.db`. Staging opnieuw vullen met een kopie van productie:

```bash
node -e 'new (require("node:sqlite").DatabaseSync)("data/dashboard.db").exec("VACUUM INTO \"data/staging.db\"")'
```

Verwijder eerst de oude `data/staging.db` en stop `npm run dev`. De kopie bevat dezelfde Jira- en Orbit-tokens; ververst de ene omgeving een token, dan kan de andere om opnieuw verbinden vragen.
