# Actiepunten uit notulen

`2026-11-06` · Lennart ter Haar

## Waarom

- Acties uit meetings verdwijnen nu in de notulen. Niemand houdt bij of ze gedaan zijn, ook niet die van collega's die Lenny aanstuurt.
- Een feed zoals de inbox maakt ze zichtbaar: je eigen acties naar je to-do's, die van collega's volgen en herinneren.
- Bouwt voort op spec `2026-11-06-notulen-maken`. Ontwerp: `public/mockups/meetings-week.html`, pagina Actiepunten en de overlay per meeting.

## Scope

- **Wel:** acties uit de notulen halen, de pagina Actiepunten, de overlay per meeting, en herinneren via een Slack-DM.
- **Niet:** Jira- of ActiveCollab-tickets aanmaken, en acties terugschrijven naar Superhuman.

## Acceptatiecriteria

1. Na het maken van de notulen haalt het dashboard elke `**Actie Naam:** wat` eruit, met de eigenaar, de meeting en het onderwerp.
2. In de zijbalk staat "Actiepunten" met het aantal open acties van Lenny.
3. De pagina opent op "Van mij". Daarnaast staan "Van collega's" en "Alles".
4. Een rij volgt de inbox: een chip (Van mij of de naam), het platform en de meeting, de actie als titel. Rechts twee kolommen: "Open notulen" en "Maak to-do aan" (eigen) of "Herinner" (collega), en daarnaast "Gedaan" en "Negeer". Geen avatars en geen Demp.
5. "Maak to-do aan" werkt zoals in de inbox en zet de actie in To-do's.
6. "Herinner" opent een Slack-DM die Claude in Lenny's toon schreef. Lenny past hem aan en klikt Verstuur. De rij toont daarna "herinnerd" met de datum.
7. Gedaan, Negeer en To-do halen de actie uit de feed, maar houden de status bij.
8. Bij een afgeronde meeting toont de stap "Actiepunten · n" met "Openen". Die opent een overlay met alleen de acties van die meeting en hun status: Open, Herinnerd, In je to-do's, Gedaan of Genegeerd. Open acties kun je daar direct afhandelen.
9. Een naam in een actie wordt gekoppeld aan een Slack-gebruiker voor de DM. Lukt dat niet, dan vraagt "Herinner" om de persoon te kiezen.

## Domeinmodel

- **Actiepunt:** wat, eigenaar (Lenny of een collega), meeting, onderwerp en status.
- **Status:** open, herinnerd, to-do, gedaan of genegeerd.

## Open vragen

- Een Slack-DM onder Lenny's naam vraagt mogelijk extra rechten naast `chat:write` (`im:write` om een DM te openen). Dat wordt bij de bouw gecontroleerd.
