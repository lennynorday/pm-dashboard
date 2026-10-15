# Budgetsturing op het overzicht

`2026-10-15` · Lennart ter Haar · Mockup: `public/mockups/budgetsturing-v8.html`

## Waarom

- Ik hoor pas dat een budget op is als een collega geen uren meer kan schrijven; in Orbit zit alles zes klikken diep.
- Er wordt steeds meer budgetgestuurd PM verwacht, per sprint en per rol, niet alleen per project.
- SLA's en lopende projecten hebben een ander ritme: een jaarpot change-uren tegenover sprints van twee weken.
- Geschreven uren lopen achter (iedereen schrijft na de demo), dus een cijfer is pas te vertrouwen als ik zie wie nog niet bij is.
- De altijd zichtbare change-uren (PM-48), de favorieten (PM-31) en de grote uitklap met alle budgetregels lossen dit niet op en maken het overzicht onrustig.

## Scope

- **Wel:** onder Mijn feed drie secties met uitklappers: Sprints, SLA's en Overige projecten. Ze vervangen de platformkaarten met projectregels.
- **Wel:** per regel geschreven, gepland en budget, met één signaal; doorklik naar Teamleader Orbit voor de rest.
- **Wel:** per persoon tot wanneer de uren geschreven zijn.
- **Wel:** favorieten en de altijd zichtbare change-uren verwijderen.
- **Niet:** een signaal voor sprintprojecten zonder planning; dat komt later (regel onderaan Sprints of feedmelding).
- **Niet:** weekgrafiek, prognose op datum, projecttotaal of eerdere sprints als eigen regels.
- **Niet:** "bijna op"-meldingen; die blijven in Mijn feed.

## Acceptatiecriteria

Elke regel

1. Een regel toont groot het geschreven aantal uren, daarnaast "/ budget" en, als er gepland is, "+Xu gepland".
2. Een balk toont geschreven (vol), gepland (gestreept) en rest (leeg); wat boven het budget uitkomt is roze met een streep op de budgetgrens.
3. Rechtsonder de balk staat één noot met icoon en tekst: "Xu te veel gepland" als geschreven + gepland boven budget uitkomt, "Xu niet ingepland" als meer dan 10% van het budget open staat, anders "Xu vrij".
4. Hoofdrij en uitklap gebruiken dezelfde kolommen, zodat de balken onder elkaar staan.
5. Elke uitklap eindigt met een link naar het project in Teamleader Orbit.

Sprints

6. Een project zonder "SLA" in de naam staat onder Sprints als er vorige, deze of volgende week iemand op ingepland of voor gereserveerd staat in Orbit (planning of reservering).
7. De huidige sprint is de map met planning of reservering deze week; de rij toont de naam van de sprint en "dag X van Y".
8. Onder de projectnaam staat "Uren compleet t/m <dag>" of, in rood met icoon, wie achterloopt met uren schrijven.
9. De uitklap toont per regel van de huidige sprint de mensen die erop schrijven: initialen, naam, uren in deze sprint en "bij t/m <dag>" of, in rood, "laatst <dag>" of "niets deze sprint".
10. Onder "Hierna" staan de komende sprints met gepland tegenover budget.
11. Wijkt de vorige sprint af van het budget, dan staat dat links onder de balk ("Vorige sprint Xu onder budget" of "over budget").

SLA's

12. Een project met "SLA" in de naam staat onder SLA's; de pot is de som van de mappen met "change" in de naam.
13. De looptijd is 1 januari tot 31 december, of vanaf de startdatum van het project als die later ligt.
14. Twee balken op dezelfde schaal: uren (% van de pot) en tijd (% van de looptijd).
15. De noot zegt "Xu voor op schema" of "Xu achter op schema" (geschreven tegenover de pot naar rato van de tijd), of "Op schema" binnen 5% van de pot.
16. De knop met open supporttickets staat onder de projectnaam.
17. In de uitklap staan alle regels van de pot, ook regels die op of afgesloten zijn ("Op" in grijs).
18. Een SLA zonder change-map toont "Geen pot gevonden".

Overige projecten

19. Een project zonder "SLA" in de naam en zonder planning of reservering vorige, deze of volgende week staat onder Overige projecten.
20. Het hele project is één rij met de som van de regels als budget, geschreven en gepland, de noot van elke regel, "laatst geschreven <dag>" bij de klant, dezelfde urenregel als bij Sprints en links onder de balk "Ingepland vanaf <dag>" of "Niets ingepland".
21. De uitklap toont per map (kopje alleen bij meer dan één) de regels met budget of uren, met dezelfde mensen als bij Sprints: wie in de laatste vier weken schreef of erop gepland staat.

Opruimen

22. Het favorietenblok, de sterknoppen en de tabel `favorieten` zijn weg.
23. De altijd zichtbare change-map onder SLA-projecten (PM-48) is weg.

## Besluiten

- SLA of niet hangt alleen af van "SLA" in de projectnaam; de rest is Sprints of Overige projecten (2026-10-15, Lenny). Project 1590 is daarvoor hernoemd.
- Overige projecten krijgen dezelfde signalen en mensen als Sprints, over het hele project (2026-10-15, Lennart).
- Gepland is planning plus het nog open deel van reserveringen; een reservering vorige, deze of volgende week maakt een project actief (2026-10-15, Lennart).

## Domeinmodel

- **Sprint:** een map in een Orbit-project; de huidige is die met planning of reservering deze week.
- **Regel:** een Orbit-taak met budget ("planned"), geschreven ("done") en gepland: de planner ("scheduled in the planner") plus het nog open deel ("left") van reserveringen op die taak.
- **Pot:** de change-mappen van een SLA samen, afgezet tegen de looptijd.
- **Bij met uren:** de laatste dag waarop iemands timesheet in Orbit definitief is (GetTimesheetStatus, één aanroep voor iedereen).

## Open vragen

- Planning per sprint en uren per persoon kosten extra Orbit-aanroepen per project (ListPlannedEntries, ListTimeEntries). Past dat binnen de Orbit-limiet?
- Afhankelijk van de fix voor regels met "(bills reserved hours)", anders mist NEMO 65u.
