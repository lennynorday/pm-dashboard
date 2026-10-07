# Orbit gefaseerd laden

`2026-10-07` · Lennart ter Haar

## Waarom

- Bij de eerste login doet de app ±110 Orbit-aanroepen tegelijk: projectlijsten, 43 klant-opzoekingen, 24 projecten en ±44 offerte-aanroepen.
- Orbit begrenst aanroepen per account, ergens rond de paar tientallen per minuut. Jij en een collega lopen er bij het inloggen allebei tegenaan; je ziet dan alleen een foutmelding.
- Een bulk-aanroep is geen uitweg: de rapportage-tools geven andere uren voor "beschikbaar", geen offerte-uren en geen mappen, en hun data is uren oud.

## Scope

- **Wel:** eerst alleen de projectlijsten ophalen (2 tot 4 aanroepen), zodat het overzicht met platforms en projecten meteen staat.
- **Wel:** klant-id's, budgetten en offertes daarna op de achtergrond ophalen, getemperd tot maximaal 20 aanroepen per minuut.
- **Wel:** zolang er op de achtergrond geladen wordt, wordt de Verversen-knop rechtsboven een voortgangsbalk ("12 van 46") en staat boven de feed: "Nog even geduld, we halen alles voor je op uit Orbit. Dat kan een paar minuten duren." De pagina ververst zichzelf tot alles binnen is.
- **Wel:** wat al bewaard is, blijft zichtbaar. Ook na Verversen staan de oude cijfers er tot de nieuwe binnen zijn.
- **Niet:** een andere bron voor de uren (rapportage-tools), zie hierboven.
- **Niet:** de cache-tijden (15 minuten budget, 24 uur offerte) aanpassen.

## Acceptatiecriteria

1. Met een lege database toont de homepagina binnen enkele seconden de platforms en projecten uit Orbit, zonder foutmelding.
2. Zolang er op de achtergrond geladen wordt, staat de melding er en ververst de pagina zichzelf; projectrijen zonder budget tonen "Wordt opgehaald" in plaats van een fout.
3. De app doet nooit meer dan 20 Orbit-aanroepen per minuut.
4. Als alles binnen is, verdwijnt de melding en staan budgetten, offertes en de feed er zoals nu.
5. Zijn alle gegevens al bewaard en vers, dan is er geen melding en geen extra aanroep.
6. Na Verversen blijven de vorige cijfers staan tot de nieuwe binnen zijn.
7. Loopt Orbit toch tegen de limiet aan, dan pauzeert de achtergrond een minuut en gaat daarna verder; de gebruiker ziet de melding, geen fout.

## Besluiten

- 20 aanroepen per minuut (2026-10-07, Lenny). Bij het testen ging ±26 achter elkaar goed en een tweede keer binnen een minuut niet; de eerste login duurt daarmee 5 à 6 minuten.
- Voortgang tonen in de Verversen-knop (2026-10-07, Lenny).
