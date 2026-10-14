# Kanban sorteren

`2026-10-14` · Lennart ter Haar · Jira [PM-50](https://in10-rotterdam.atlassian.net/browse/PM-50)

## Waarom

- De kolommen op het kanbanbord staan altijd nieuwste eerst. Wat belangrijk is, staat daardoor soms onderaan, en ik kan de volgorde niet zelf bepalen.

## Scope

- **Wel:** een keuze Nieuwste · Prio · Eigen volgorde naast de wissel Lijst/Kanban.
- **Wel:** in Eigen volgorde kaarten binnen een kolom slepen, met een lijn op de plek waar de kaart landt.
- **Wel:** de gekozen sortering onthouden per gebruiker.
- **Niet:** sorteren in de lijstweergave; die blijft op prio.
- **Niet:** een melding "Naar Eigen volgorde" bij slepen in een andere sortering. De bestaande melding kent alleen "Ongedaan maken".

## Acceptatiecriteria

1. Nieuwste is de huidige volgorde: nieuwste bovenaan. Prio zet 1 Urgent bovenaan en 4 Laag onderaan, gelijke prio nieuwste eerst.
2. In Eigen volgorde verplaatst slepen binnen een kolom de kaart naar de plek van de lijn; de volgorde blijft na verversen staan.
3. Slepen naar een andere kolom werkt in elke sortering en zet de status om. De kaart komt bovenaan die kolom in de eigen volgorde; in Eigen volgorde op de plek van de lijn.
4. Wisselen van sortering verliest de eigen volgorde niet.
5. Buiten Eigen volgorde staat de hint "Sleep binnen een kolom in Eigen volgorde".
6. Een nieuwe kaart staat bovenaan zijn kolom in de eigen volgorde.
7. De gekozen sortering staat na herladen weer goed.

## Aanpak

- Kolom `positie` (nullable) op `taken`; leeg = nog niet verplaatst, telt als bovenaan, nieuwste eerst.
- Eén server action schrijft bij een drop de gesorteerde ids van de doelkolom weg, met de status.
- De sortering staat in een cookie, zoals de weergave (Lijst/Kanban).
