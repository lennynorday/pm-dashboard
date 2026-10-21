---
name: weekplanning
description: Vul een weekplanning in voor een (samenwerk)sprint en lever die als JSON-bestand dat je opent in de Weekplanner van Norday. Gebruik deze skill wanneer iemand vraagt om een weekplanning, sprintplanning of samenwerksprint in te plannen, uit te werken of om te zetten naar de weekplanning, ook als het woord "JSON" niet valt.
---

# Weekplanning invullen

De Weekplanner toont een planning in blokken per dag, van 09:00 tot 17:00, voor één of meer weken. Jij maakt het bestand. De gebruiker opent het in de tool met **Open bestand**.

## Werkwijze

1. Haal uit het gesprek wat je nodig hebt. Vraag alleen naar wat ontbreekt, en stel één vraag tegelijk:
   - de maandag waarop de planning begint
   - het aantal weken
   - de sessies met de klant: wat, wanneer, wie en waar
   - wat Norday en de klant tussendoor doen
2. Begin met `lege-planning.json` uit deze skill en vul het in volgens de regels hieronder.
3. Controleer het bestand met de checklist onderaan.
4. Lever het als bestand met de naam `<titel>-week-<weeknummer>.json`, bijvoorbeeld `samenwerksprint-week-6.json`. Kun je geen bestanden maken, zet de JSON dan in één codeblok en zeg dat de gebruiker het opslaat als `.json`.
5. Vat de planning daarna in een paar regels samen: per week de sessies met dag en tijd.

## Formaat

```json
{
  "titel": "Samenwerksprint",
  "start": "2027-02-08",
  "weken": 2,
  "categorieen": [
    { "id": "sessie", "naam": "Sessie", "kleur": "#fff355" },
    { "id": "norday", "naam": "Werk Norday", "kleur": "#3d1028" },
    { "id": "klant", "naam": "Werk klant", "kleur": "#ff0d4a" },
    { "id": "voorbereiden", "naam": "Voorbereiden", "kleur": "#d5b3ff" }
  ],
  "notities": { "0": ["Templates laten drukken"] },
  "blokken": [
    { "id": 1, "type": "sessie", "titel": "Project kickoff", "dag": 1, "van": "09:00", "tot": "11:30", "wie": "Team en klant", "locatie": "Rotterdam" },
    { "id": 2, "type": "norday", "titel": "Werk Norday", "dag": 1, "van": "12:00", "tot": "17:00", "detail": "Templates uitwerken" }
  ]
}
```

### Velden

| Veld | Verplicht | Regel |
|---|---|---|
| `titel` | ja | Naam van de planning. Komt groot boven de export. |
| `start` | ja | Datum `JJJJ-MM-DD` en altijd een **maandag**. |
| `weken` | ja | Heel getal, 1 of meer. |
| `categorieen` | nee | De categorieën van de blokken, zie hieronder. Laat je het veld weg, dan gebruikt de tool de vier standaardcategorieën. |
| `notities` | nee | Toelichting per dag als lijstje. De sleutel is de dagindex als tekst (`"0"`), de waarde een lijst met korte zinnen. Laat dagen zonder toelichting weg. |
| `blokken` | ja | De blokken in de planning, zie hieronder. |

### Blokken

| Veld | Verplicht | Regel |
|---|---|---|
| `id` | ja | Uniek heel getal. Nummer gewoon door: 1, 2, 3, … |
| `type` | ja | De `id` van een categorie uit `categorieen`, met precies die spelling. |
| `titel` | ja | Kort, bijvoorbeeld "Werksessie personas". |
| `dag` | ja | Dagindex, zie hieronder. |
| `van`, `tot` | ja | `UU:MM` op een heel kwartier (`:00`, `:15`, `:30`, `:45`), tussen `09:00` en `17:00`, en `tot` ligt na `van`. |
| `wie`, `locatie`, `detail` | nee | Alleen invullen als het iets toevoegt. Laat het veld anders weg. |

### Categorieën

Elke categorie heeft een `id` (korte sleutel zonder spaties), een `naam` (staat in de legenda) en een `kleur` (hex, zoals `#fff355`). De tekstkleur in een blok kiest de tool zelf. Dit zijn de standaardcategorieën:

| `id` | `naam` | `kleur` | Gebruik voor |
|---|---|---|---|
| `sessie` | Sessie | `#fff355` geel | Een afspraak met de klant: kickoff, werksessie, review, demo |
| `norday` | Werk Norday | `#3d1028` donker | Werk dat het Norday-team zelf doet |
| `klant` | Werk klant | `#ff0d4a` roze | Werk of huiswerk voor de klant |
| `voorbereiden` | Voorbereiden | `#d5b3ff` lila | Voorbereiding op een sessie |

Vraagt de gebruiker om een andere indeling, pas dan de lijst aan of voeg categorieën toe. Kies kleuren uit de Norday-tinten: `#3d1028`, `#ff0d4a`, `#fff355`, `#d5b3ff`, `#ffcad7`, `#eee1ff`, `#fffabb` of `#1b1b1b`. Geef elke categorie een andere kleur.

### Dagindex

De dagen tellen door over alle weken, alleen werkdagen:

| | Ma | Di | Woe | Do | Vrij |
|---|---|---|---|---|---|
| Week 1 | 0 | 1 | 2 | 3 | 4 |
| Week 2 | 5 | 6 | 7 | 8 | 9 |
| Week 3 | 10 | 11 | 12 | 13 | 14 |

De hoogste dagindex is `weken × 5 − 1`. Een blok met een hogere index valt buiten de planning en is niet te zien.

## Goede planning

- Zet sessies op de tijd die de gebruiker noemt. Verzin geen datums of tijden voor sessies. Vraag ernaar.
- Vul de rest van de dag met `norday` of `klant`, zodat elke dag sluit op 17:00. Een lege dag mag als de gebruiker dat wil of op die dag niets gebeurt.
- Twee blokken op hetzelfde moment komen naast elkaar te staan. Dat kan, bijvoorbeeld Norday en de klant die tegelijk werken. Zet er niet meer dan twee naast elkaar, anders worden ze onleesbaar.
- Een sessie krijgt vaak een blok `voorbereiden` ervoor, op dezelfde of de vorige dag.
- Laat 15 tot 30 minuten tussen een sessie en het volgende blok voor reistijd of pauze, als de gebruiker niets anders zegt.
- Houd titels kort. De blokken zijn smal, zeker bij twee weken naast elkaar.

## Checklist voor je levert

- [ ] De JSON is geldig: dubbele aanhalingstekens, geen komma na het laatste item, geen commentaar.
- [ ] `start` is een maandag.
- [ ] Elke `id` is uniek.
- [ ] Elke `type` is een `id` uit `categorieen`, met precies die spelling.
- [ ] Elke categorie heeft een unieke `id` en een kleur als `#rrggbb`.
- [ ] Elke `dag` ligt tussen 0 en `weken × 5 − 1`.
- [ ] Alle tijden staan op een kwartier, tussen 09:00 en 17:00, en `tot` ligt na `van`.
- [ ] Geen derde blok naast twee overlappende blokken.
