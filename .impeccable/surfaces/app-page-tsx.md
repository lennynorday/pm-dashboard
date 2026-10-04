---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/accounts/[slug]/page.tsx", "app/layout.tsx"]
---

# Surface: PM-dashboard (home, accountpagina, zijbalk)

Scope: de hele app-shell (zijbalk, home `/`, accountpagina `/accounts/[slug]`). Mode: Operate.

Taak: de hele dag open in een tabblad; tussendoor kijken waar actie nodig is en doorklikken naar Jira, Orbit, Slack. Home toont eerst wat aandacht vraagt over alle accounts heen (verlopen sprints, supporttickets die op Norday wachten), daarna de stand per account. Geen verzonnen budget- of urencijfers: die komen in fase 3.

Redesign: het oude paarse thema met afgeronde kaarten is weggegooid; inhoud, functies en links blijven.

## Direction contract

THESIS: Het dashboard spreekt de taal van de Norday-website: elk werkgebied is een vol, vierkant kleurveld uit de huisstijl, met Apercu-kapitalen als koppen. Het weigert de categorienorm van zachtgrijze, afgeronde kaarten met KPI-tegels.

OWN-WORLD: Witte grond; zijbalk altijd een vol Dark-veld met witte tekst en een gele markering voor de actieve pagina; aandacht als vol Lilac-veld; de actieve sprint als Yellow-vlak. Vierkante vlakken en kaders van 1px Dark, ronde pillknoppen, geen schaduwen. Koppen in Barlow Condensed (terugval voor Apercu) in kapitalen, tekst in Suisse-terugval, alle aantallen in tabulaire cijfers. Pink alleen voor iconen en randen van signalen. Eén statustaal overal: tekst plus vorm, nooit alleen kleur.

STORY: Lenny ziet in een oogopslag of er iets is dat nu aandacht vraagt en bij welk account; hij klikt het signaal door naar Jira, of loopt de accounts langs om de stand te zien.

FIRST VIEWPORT: Links de Dark-zijbalk (navigatie, accounts, thema). Rechts bovenaan de paginatitel OVERZICHT met daarnaast de versheid en Verversen. Daaronder de aandachtsband: een vol Lilac-veld over de hele breedte van het werkgebied, met de kop AANDACHT, het aantal, en per signaal een rij (icoon, account, wat, link). Bij nul signalen krimpt de band tot één rustige regel. Daaronder het accountgrid: per account een vierkant vlak met kop, Jira-aantallen in vaste kolommen, open support en de projecten.

FORM: Norday-kleurvelden, positie 1 op de eigen lijst (gekozen als pick), seed 7c9e4774. Signature move: de aandachtsband als vol Lilac-veld dat meegroeit met het aantal signalen.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
