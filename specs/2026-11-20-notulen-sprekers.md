# Notulen: sprekers en namen corrigeren

## Probleem

Plaud levert het transcript met "Speaker 1", "Speaker 2". Claude raadt wie wie is. Gokt hij bij een 1-op-1 verkeerd, dan staan alle namen en actiepunten omgedraaid, en dat is nu alleen met de hand per plek te herstellen.

## Oplossing

Mockup: `public/mockups/notulen-sprekers.html`.

1. **Claude schrijft verwijzingen, geen namen.** Iemand die spreekt staat in de notulen als `[[Speaker 1]]`. Na de notulen geeft Claude een blok `<sprekers>` met per spreker de naam die hij denkt en een letterlijke zin uit het transcript.
2. **Sprekersveld boven de notulen** in de akkoord-overlay: per spreker een keuzelijst (Slack-collega's plus de gekozen namen) en de zin. Een naam kiezen die bij een andere spreker staat, wisselt die twee.
3. **Elke naam in de tekst is klikbaar.** Dropdown: de sprekers, "Andere collega…" (zoeken in Slack-collega's), "Ontkoppelen…" (zelf typen), en "Terug naar spreker" als de plek is aangepast. Een losse keuze geldt alleen voor die plek en blijft staan bij een wijziging in het sprekersveld. Opslag: `[[Speaker 1|Eva Smit]]`.
4. **Bij akkoord** worden de namen ingevuld: in de regel Aanwezig de volledige naam, elders de voornaam. Daarna is `tekst` gewone Markdown, dus Superhuman, actiepunten en het Slack-bericht werken zoals nu.

## Opslag

- Nieuwe kolom `notulen.sprekers`: JSON `[{ label, naam, citaat }]`.
- `tekst` bevat vóór akkoord de verwijzingen, na akkoord de namen.
- Weergave vóór akkoord (notulen lezen, weggelaten passages) vult de namen in met dezelfde functie.

## Buiten scope

- Corrigeren na akkoord: de notulen zijn dan alleen-lezen (dat is nu ook zo).
- Notulen van vóór deze wijziging hebben geen verwijzingen; daar verandert niets.
- Een externe persoon kiezen als spreker die geen Slack-collega is en die Claude niet noemde.
