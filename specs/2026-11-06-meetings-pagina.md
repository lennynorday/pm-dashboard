# Meetings-pagina: agenda met koppelingen

`2026-11-06` · Lennart ter Haar

## Waarom

- Lenny leeft in Google Agenda, maar ziet nergens per meeting bij welk project die hoort of wat er nog mee moet.
- Meeting-notulen gaan nu via veel losse stappen (Plaud, Claude, Superhuman, mail, Slack), en daar valt van alles tussen. Er is geen overzicht en er zijn geen seintjes.
- Deze spec legt het fundament: een Meetings-pagina met de agenda, waarin elke meeting aan een platform, Team of Privé hangt, of wordt overgeslagen. De specs voor notulen, delen en actiepunten bouwen hierop voort.
- Ontwerp: `public/mockups/meetings-week.html` (de notulenstappen daarin horen bij de latere specs).

## Scope

- **Wel:** Google Agenda lezen, een weekweergave en een lijstweergave, automatische herkenning, koppelen en ontkoppelen, overslaan per meeting of serie, Instellingen voor series en Team-kanalen.
- **Later:** notulen maken (spec `notulen-maken`), delen (spec `notulen-delen`) en actiepunten (spec `actiepunten`), met de statusdots, de checklist, "Notulen te doen" en de seintjes in de inbox.
- **Niet:** meetings plannen, verzetten of uitnodigen. Dat blijft in Google Agenda.

## Acceptatiecriteria

1. Google-login vraagt ook leestoegang tot de agenda. Een bestaande koppeling zonder die toegang toont een melding met "Opnieuw verbinden".
2. In de zijbalk staat "Meetings". De pagina toont de werkweek (ma–vr, 9:00–18:00) met afspraken uit Google Agenda. Met de pijltjes ga je naar een vorige of volgende week, met "Vandaag" terug naar deze week.
3. Er is een schakelaar Week / Lijst. De lijst toont per dag een rij per meeting met tijd, titel, waar hij bij hoort en status.
4. Herkenning: staat de naam of een roepnaam van een platform als heel woord in de titel, dan hoort de meeting bij dat platform. Zonder projectnaam is hij Privé. Afspraken zonder andere deelnemers zijn Focus en doen niet mee.
5. Een meeting met een deelnemer van buiten norday.nl is Extern, anders Intern. Dat is zichtbaar als chip.
6. Een serie die als Team is ingesteld, toont als Team.
7. In het paneel van een meeting opent de pil met het potloodje een menu: platforms, Team-overleg en Privé. Daaronder kies je "Alleen deze meeting" of "Deze en alle volgende in deze reeks", en bij een losse meeting "Ook toekomstige meetings met '…' in de titel". Dit werkt voor afgelopen en toekomstige meetings.
8. Een keuze uit criterium 7 blijft bewaard na herladen en gaat vóór de automatische herkenning.
9. "Geen notulen" slaat een losse meeting over. Bij een serie opent het een menu met "Alleen deze meeting" en "Hele serie". Een overgeslagen meeting staat grijs in de week, met "Terugzetten" in het paneel.
10. Instellingen toont de overgeslagen series, met "Terugzetten", en de Team-series met het Slack-kanaal per serie.
11. Rechtsboven filtert "Alle platforms ▾" op platform, Team of Privé, met bij elk de uren in overleg die week. Andere afspraken vervagen in de week en verdwijnen in de lijst.
12. Het zijpaneel is even hoog als de agenda en scrolt intern.
13. Faalt Google Agenda, dan toont de pagina een melding, en de rest van het dashboard werkt door.

## Domeinmodel

- **Meeting:** een afspraak uit Google Agenda, met optioneel een serie (de herhaling in Google).
- **Hoort bij:** een platform, Team of Privé. Komt uit de herkenning of uit een handmatige keuze.
- **Soort:** Extern of Intern, op basis van de deelnemers (alleen bij een platform).
- **Roepnaam:** een alternatieve naam van een platform voor de herkenning (bijvoorbeeld CMU). Wordt bewaard bij de accountgegevens in Superhuman, in de kolom Roepnamen (gescheiden door komma's). Het dashboard leest ze alleen; je beheert ze in Superhuman.
- **Regel:** een handmatige keuze voor één meeting, een serie of een titelwoord. Wordt lokaal bewaard.
- **Overgeslagen:** een meeting of serie zonder notulen. Wordt lokaal bewaard.
- **Team-serie:** een terugkerend intern overleg zonder project, met één Slack-kanaal.

## Open vragen

- Waar beheer je roepnamen: op de platformpagina naast de links, of alleen via "Ook toekomstige meetings met '…' in de titel"?
