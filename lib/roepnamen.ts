/** Een roepnaam zonder spaties rond; lege items vervallen en dubbelen (hoofdletterongevoelig) tellen één keer. */
export function normaliseerRoepnamen(waarde: string | string[]): string[] {
  const items = typeof waarde === "string" ? waarde.split(",") : waarde;
  const gezien = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const sleutel = item.toLowerCase();
      if (!item || gezien.has(sleutel)) return false;
      gezien.add(sleutel);
      return true;
    });
}

type PlatformRoepnamen = { naam: string; roepnamen: string[] };

/** De melding als een van deze roepnamen al bij een ander platform staat; anders null. */
export function roepnaamConflict(
  roepnamen: string[],
  anderen: PlatformRoepnamen[],
): string | null {
  for (const roepnaam of roepnamen) {
    const sleutel = roepnaam.toLowerCase();
    const platform = anderen.find((ander) =>
      ander.roepnamen.some((naam) => naam.toLowerCase() === sleutel),
    );
    if (platform) return `${roepnaam} hoort al bij ${platform.naam}`;
  }
  return null;
}
