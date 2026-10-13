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
 * `wachtOpJou` zijn die laatste berichten die nog niet `afgehandeld` zijn,
 * `beantwoord` de kanaal-id's waarvan het laatste bericht dat wel is.
 */
export function deelGesprekkenIn(
  dms: Bericht[],
  afgehandeld: (bericht: Bericht) => boolean,
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
      .filter(([, bericht]) => !afgehandeld(bericht))
      .map(([, bericht]) => bericht),
    beantwoord: laatste
      .filter(([, bericht]) => afgehandeld(bericht))
      .map(([id]) => id),
  };
}
