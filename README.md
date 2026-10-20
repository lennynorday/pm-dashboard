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
sqlite3 data/dashboard.db "VACUUM INTO 'data/staging.db'"
```

Verwijder eerst de oude `data/staging.db` en stop `npm run dev`. De kopie bevat dezelfde Jira- en Orbit-tokens; ververst de ene omgeving een token, dan kan de andere om opnieuw verbinden vragen.

## To-do's en inbox in Claude (MCP)

`npm run --silent mcp` start een lokale MCP-server op `data/dashboard.db`, zodat Claude Desktop en Claude Code je to-do's en inbox kunnen lezen en bijwerken. Het dashboard hoeft niet te draaien. Claude.ai in de browser kan er niet bij.

Claude Code:

```bash
claude mcp add --scope user pm-dashboard -- npm run --silent --prefix /Users/lennartterhaar/Code/pm-dashboard mcp
```

Claude Desktop: zet dit onder `mcpServers` in `~/Library/Application Support/Claude/claude_desktop_config.json` en herstart de app:

```json
"pm-dashboard": {
  "command": "/opt/homebrew/bin/npm",
  "args": ["run", "--silent", "--prefix", "/Users/lennartterhaar/Code/pm-dashboard", "mcp"],
  "env": { "PATH": "/opt/homebrew/bin:/usr/bin:/bin" }
}
```

Claude Desktop start de server zonder je shell-PATH; `env` zorgt dat npm `node` vindt. Staan er meer gebruikers in de database, geef dan `DASHBOARD_EMAIL` mee als omgevingsvariabele.
