import type { SlackTodo } from "./api";

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
 * Deelt DM-berichten (nieuwste eerst) in per gesprek. `wachtOpJou` zijn per
 * gesprek de berichten na het laatste `afgehandelde` (nieuwste eerst), zodat
 * een verhaal in losse berichten samen binnenkomt; `beantwoord` de kanaal-id's
 * waarvan het laatste bericht afgehandeld is.
 */
export function deelGesprekkenIn(
  dms: Bericht[],
  afgehandeld: (bericht: Bericht) => boolean,
): { wachtOpJou: Bericht[][]; beantwoord: string[] } {
  const perGesprek = new Map<string, Bericht[]>();
  for (const bericht of dms) {
    const id = kanaal(bericht).id;
    if (typeof id === "string") {
      perGesprek.set(id, [...(perGesprek.get(id) ?? []), bericht]);
    }
  }
  const open = [...perGesprek].map(([id, berichten]) => {
    const eind = berichten.findIndex(afgehandeld);
    return [id, eind === -1 ? berichten : berichten.slice(0, eind)] as const;
  });
  return {
    wachtOpJou: open
      .filter(([, berichten]) => berichten.length > 0)
      .map(([, berichten]) => berichten),
    beantwoord: open
      .filter(([, berichten]) => berichten.length === 0)
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

/**
 * Een bewaard bericht uit een DM-gesprek dat al in de inbox staat, wordt dat
 * gesprek (met label Bewaard) in plaats van een los item ernaast.
 */
export function voegBewaardSamen(
  bewaard: SlackTodo[],
  items: SlackTodo[],
): { bewaard: SlackTodo[]; items: SlackTodo[] } {
  const kanaalVan = (todo: SlackTodo) =>
    todo.permalink.split("/archives/")[1]?.split("/")[0];
  const gesprekken = new Set(items.map((item) => item.gesprek));
  const bewaardIn = new Set(bewaard.map(kanaalVan));
  return {
    bewaard: bewaard.filter((todo) => !gesprekken.has(kanaalVan(todo) ?? "")),
    items: items.map((item) =>
      item.gesprek && bewaardIn.has(item.gesprek)
        ? { ...item, soort: "Bewaard" }
        : item,
    ),
  };
}
