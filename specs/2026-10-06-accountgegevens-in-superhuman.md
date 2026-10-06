# Accountgegevens in Superhuman

`2026-10-06` · Lennart ter Haar

## Waarom

- Accountgegevens (Jira-keys, support-organisaties, contactpersonen, links naar Slack, Jira, Drive en omgevingen) zijn bedoeld als gedeeld, maar staan in de lokale database.
- Met de desktop-app ([spec](2026-10-06-desktop-app.md)) krijgt elke collega een lege kopie; wat de een invult, ziet de ander niet.
- In Superhuman worden ze één gedeelde bron, en meteen een overzicht van kanalen, borden en omgevingen voor collega's die de app niet gebruiken.
- Collega's hoeven niets te koppelen: de app gebruikt één gedeeld token, net als de Google- en Jira-secrets.

## Scope

- **Wel:** de bestaande [tabel op de pagina Shortcuts](https://docs.superhuman.com/d/_dG775GfEi_2#_tugrid-aiardDerdh) in _Culture Rotterdam Mission Control_ (doc `G775GfEi_2`, tabel `grid-aiardDerdh`) als bron van de accountgegevens. Deze tabel wordt omgevormd, niet vervangen: het token is aan precies deze tabel gekoppeld.
- **Wel:** de app leest én schrijft daarin via de Superhuman Docs API, met één gedeeld API-token van Lennart uit de config (`SUPERHUMAN_API_TOKEN`), beperkt tot die ene tabel; wijzigingen vanuit de app staan in Superhuman op naam van Lennart.
- **Wel:** eenmalig de huidige lokale gegevens overzetten naar Superhuman (handmatig, geen migratiecode).
- **Niet:** Superhuman-koppeling per gebruiker; die komt pas met een volgende Superhuman-integratie, in een eigen spec.
- **Niet:** voorkeuren per gebruiker (verborgen projecten, genegeerde meldingen); die blijven lokaal.

## Acceptatiecriteria

1. De tabel `grid-aiardDerdh` heeft de kolommen uit het domeinmodel en één rij per account, leesbaar voor collega's zonder de app; er is geen nieuwe tabel aangemaakt.
2. Elk account in Superhuman is gekoppeld op het Orbit-klant-id en toont daarnaast de klantnaam; een naamswijziging in Orbit breekt de koppeling niet.
3. Het token komt uit `SUPERHUMAN_API_TOKEN` en staat in `.env.example` beschreven; een gebruiker hoeft niets te koppelen.
4. Een ingelogde gebruiker ziet op een accountpagina de gegevens uit Superhuman.
5. Een wijziging via het bewerkformulier in de app staat daarna in Superhuman en is zichtbaar voor een collega.
6. De app haalt de gegevens één keer per dag uit Superhuman, en op de instellingenpagina op aanvraag met een knop _Verversen_.
7. Direct na opslaan toont de app de nieuwe gegevens, ook als Superhuman de schrijfactie nog verwerkt.
8. Ontbreekt het token, of is het ongeldig of ingetrokken, dan toont een accountpagina een duidelijke melding in plaats van een fout.
9. Het token heeft alleen toegang tot die ene tabel.
10. De lokale tabel `account_gegevens` wordt niet meer gebruikt en is verwijderd.

## Domeinmodel

- **Account** — klant uit Orbit, herkend aan het Orbit-klant-id; heeft een klantnaam (uit Orbit, ter herkenning), een eigen naam, AM, Jira-keys en support-organisaties.
- **Links** — per account één URL per linktype uit de app (Superhuman intern, Superhuman gedeeld, Slack intern, Slack klant, Jira, Drive, offerte, acceptatie, productie, overig), elk in een eigen kolom.
- **Contactpersonen** — per account in één tekstkolom.
