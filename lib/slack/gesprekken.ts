type Bericht = Record<string, unknown>;

function kanaal(bericht: Bericht): Bericht {
  return typeof bericht.channel === "object" && bericht.channel !== null
    ? (bericht.channel as Bericht)
    : {};
}

/** Een bericht uit een DM of groeps-DM. */
export function isGesprek(bericht: Bericht): boolean {
  const { is_im, is_mpim } = kanaal(bericht);
  return is_im === true || is_mpim === true;
}

/**
 * Deelt DM-berichten (nieuwste eerst) in per gesprek, op het laatste bericht:
 * `wachtOpJou` zijn die laatste berichten van een ander, `beantwoord` de
 * kanaal-id's waarin jij als laatste reageerde.
 */
export function deelGesprekkenIn(
  dms: Bericht[],
  ik: string,
): { wachtOpJou: Bericht[]; beantwoord: string[] } {
  const laatsteVanGesprek = new Map<string, Bericht>();
  for (const bericht of dms) {
    const id = kanaal(bericht).id;
    if (typeof id === "string" && !laatsteVanGesprek.has(id)) {
      laatsteVanGesprek.set(id, bericht);
    }
  }
  const laatste = [...laatsteVanGesprek];
  return {
    wachtOpJou: laatste
      .filter(([, bericht]) => bericht.user !== ik)
      .map(([, bericht]) => bericht),
    beantwoord: laatste
      .filter(([, bericht]) => bericht.user === ik)
      .map(([id]) => id),
  };
}
