# Notulen naar een vaste pagina per platform

`2026-11-11` · Lennart ter Haar · geen ticket

## Waarom

- Notulen voor de interne Boijmans-stand-up kwamen niet in Superhuman: "Superhuman gaf een fout (400)".
- Oorzaak 1: de pagina's van een doc komen per 100 binnen; bij de tweede bladzijde sturen we `limit` mee naast `pageToken`, en dat weigert Superhuman. Elke doc met meer dan 100 pagina's faalt.
- Oorzaak 2: het dashboard zoekt een pagina die precies "Notulen" heet. In de Boijmans-doc heet de juiste pagina "Notulen (intern)" en staat er een "Notulen" diep in het archief, dus de notulen zouden op de verkeerde plek landen.
- Een directe link naar de notulenpagina in de wegwijzer-tabel maakt de koppeling expliciet: geen raden op naam.

## Scope

- **Wel:** paginering zonder `limit` op vervolgpagina's; twee nieuwe linktypen (notulen intern, notulen gedeeld) in de wegwijzer-tabel; die link gebruiken als bestemming van de notulen.
- **Wel:** zonder notulenlink het huidige gedrag behouden (pagina "Notulen" zoeken in de doc).
- **Niet:** kolommen aanmaken vanuit het dashboard (Lennart maakt ze zelf aan in Superhuman); notulen van Team en Privé (blijven naar Lennys Dashboard); bestaande notulenpagina's verplaatsen.

## Acceptatiecriteria

1. Alle pagina's van een doc met meer dan 100 pagina's komen binnen zonder 400; vervolgverzoeken sturen alleen `pageToken` mee.
2. De wegwijzer-tabel kent twee nieuwe linktypen, "Notulen intern" en "Notulen gedeeld", met elk een eigen kolom; het dashboard leest ze uit zoals de andere links.
3. De `SLEUTEL` in `lib/accountgegevens.ts` is opgehoogd, zodat de nieuwe velden niet uit een oude cache komen.
4. Een interne meeting met een "Notulen intern"-link krijgt zijn notulen als subpagina van precies die pagina; een externe meeting idem met "Notulen gedeeld".
5. De link wordt gekoppeld aan een pagina door hem te vergelijken met de `browserLink` van de pagina's in de doc (op het pagina-deel na `_su`, zodat een link met of zonder paginanaam ervoor werkt). De API kent geen werkende omzetting van paginalink naar pagina-id.
6. Wijst de link naar een pagina die niet (meer) in de doc staat, dan toont de meeting: "De notulenlink van <platform> wijst naar een pagina die niet bestaat."
7. Zonder notulenlink werkt het zoals nu: subpagina onder de pagina "Notulen" in de doc uit "Superhuman intern" of "Superhuman gedeeld", met de bestaande foutmeldingen.
8. De Boijmans-stand-up van 11 nov komt na "Opnieuw proberen" onder "Notulen (intern)" in de interne Boijmans-doc, als de link daar is ingevuld.
