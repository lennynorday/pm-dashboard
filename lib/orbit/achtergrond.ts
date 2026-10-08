/**
 * Orbit-gegevens die op de achtergrond worden opgehaald, zodat een pagina niet
 * hoeft te wachten tot de rate limit van Orbit weer ruimte geeft.
 */

// ponytail: één wachtrij voor het hele proces; per gebruiker splitsen als er meer gebruikers tegelijk in één app zitten.
const bezig = new Set<string>();
let klaar = 0;

/** Start de taak, tenzij die al loopt. */
export function opAchtergrond(
  sleutel: string,
  taak: () => Promise<unknown>,
): void {
  if (bezig.has(sleutel)) return;
  bezig.add(sleutel);
  void taak()
    .catch(() => undefined)
    .finally(() => {
      bezig.delete(sleutel);
      klaar = bezig.size === 0 ? 0 : klaar + 1;
    });
}

export type Voortgang = { klaar: number; totaal: number };

/** Hoe ver de huidige ronde is; null als er niets op de achtergrond loopt. */
export function voortgang(): Voortgang | null {
  return bezig.size === 0 ? null : { klaar, totaal: klaar + bezig.size };
}
