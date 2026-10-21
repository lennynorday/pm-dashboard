# Eigen signalen in Mijn feed

Jira: PM-1

## Waarom

Mijn feed toont alleen signalen per platform. Wat ik zelf moet doen (timesheet indienen, tickets op mijn naam oppakken) staat er niet in.

## Scope

- Signaal "timesheet": mijn timesheet staat niet vast t/m vrijdag van vorige week. Zelfde check als "achter met uren" bij Sprints (GetTimesheetStatus), gekoppeld op mijn naam uit de Google-login.
- Signaal "ligt stil": open tickets op mijn naam in heel Jira (`assignee = currentUser()`), die langer dan 5 werkdagen niet zijn bijgewerkt. Eén item met het aantal en een link naar de zoekopdracht in Jira.
- Beide alleen onder het filter Alles, met Orbit of Jira als bron in plaats van een platform.

Buiten scope: meldingen over uren van collega's (vervallen op 21-10-2026).

## Acceptatiecriteria

1. Staat mijn timesheet niet vast t/m vrijdag van vorige week, dan staat er één item "Je timesheet van vorige week is nog niet ingediend", met t/m welke dag hij wel vaststaat.
2. Sta ik niet in de timesheetstatus van Orbit (naam wijkt af), dan komt er geen item.
3. Zijn er open tickets op mijn naam die 5 werkdagen of langer niet zijn bijgewerkt, dan staat er één item met het aantal; de link opent die tickets in Jira.
4. Negeren werkt zoals bij andere items; het timesheet-item komt een week later terug, het tickets-item als het aantal verandert.
5. Zonder Jira-koppeling of terwijl Orbit nog laadt, komt er geen item en geen foutmelding.
