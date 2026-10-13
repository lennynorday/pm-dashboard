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

/** Het begin van de thread van een bericht, als `kanaal:ts`; zonder thread het bericht zelf. */
function threadVan(bericht: Bericht): string {
  const permalink =
    typeof bericht.permalink === "string" ? bericht.permalink : "";
  const begin = new URL(permalink, "https://slack.com").searchParams.get(
    "thread_ts",
  );
  return `${kanaal(bericht).id}:${begin ?? bericht.ts}`;
}

/**
 * Of je na een bericht in dezelfde thread zelf iets schreef. `eigen` zijn je
 * eigen berichten; een los antwoord in het kanaal telt niet, want dat hoeft
 * geen antwoord te zijn.
 */
export function beantwoordInThread(
  eigen: Bericht[],
): (bericht: Bericht) => boolean {
  const laatste = new Map<string, number>();
  for (const bericht of eigen) {
    const thread = threadVan(bericht);
    laatste.set(thread, Math.max(laatste.get(thread) ?? 0, Number(bericht.ts)));
  }
  return (bericht) =>
    (laatste.get(threadVan(bericht)) ?? 0) > Number(bericht.ts);
}
