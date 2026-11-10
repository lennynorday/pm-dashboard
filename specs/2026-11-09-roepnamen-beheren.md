# Roepnamen beheren

`2026-11-09` · Lennart ter Haar · TODO: PR-link

## Waarom

- Meetings herkent een platform aan zijn naam of een roepnaam in de agendatitel (spec 2026-11-06-meetings-pagina).
- Roepnamen staan in de kolom Roepnamen in Superhuman, maar het accountformulier kan ze niet tonen of wijzigen.
- Daarnaast bestaat een tweede, lokale lijst: titelwoorden die je via de pil vastlegt. Twee lijsten voor hetzelfde maakt onduidelijk waarom een meeting ergens bij hoort.
- Doel: één lijst roepnamen per platform, in Superhuman, te beheren in het formulier en via de pil.

## Scope

- **Wel:** veld Roepnamen in het accountformulier; de pil-optie voor titelwoorden schrijft een roepnaam naar Superhuman; dubbele roepnamen blokkeren.
- **Niet:** de herkenningsvolgorde zelf; chips of autocomplete in het veld.

## Acceptatiecriteria

1. Het accountformulier op de platformpagina heeft een tekstveld Roepnamen, gescheiden door komma's, net als Jira-keys.
2. Het veld toont de huidige roepnamen uit Superhuman; opslaan schrijft ze naar de kolom Roepnamen van die rij.
3. Een leeg veld bij opslaan maakt de kolom leeg.
4. Spaties rond een roepnaam worden weggehaald; lege items tussen komma's vervallen; dezelfde roepnaam twee keer in één veld wordt één keer bewaard (hoofdletterongevoelig).
5. Staat een roepnaam al bij een ander platform (hoofdletterongevoelig), dan slaat het formulier niet op en toont het bij het veld: "<roepnaam> hoort al bij <platform>".
6. In het paneel van een meeting voegt "Ook toekomstige meetings met '…' in de titel" bij een platform dat woord toe aan de roepnamen van dat platform in Superhuman.
7. Staat dat woord al bij een ander platform, dan toont de pil dezelfde melding als criterium 5 en verandert er niets.
8. Na opslaan (formulier of pil) zie je het effect op Meetings direct, zonder te wachten tot Superhuman bijgewerkt is.
9. Bij Team en Privé biedt de pil alleen "Alleen deze meeting" en "Deze en alle volgende in deze reeks", geen titelwoord-optie.
10. De lokale titelwoord-regels worden niet meer gebruikt voor de herkenning en niet meer aangemaakt.
