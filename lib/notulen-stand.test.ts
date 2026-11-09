import assert from "node:assert";
import { test } from "node:test";
import { notulenStatus, type NotulenRij } from "./notulen-stand.ts";

const EIND = "2026-11-09T10:00:00+01:00";
const eind = Date.parse(EIND);
const UUR = 60 * 60 * 1000;
const meeting = {
  hoort: "wo2",
  overgeslagen: null,
  afgelopen: true,
  einde: EIND,
  extern: false,
} as const;
const rij = (stap: number, extra: Partial<NotulenRij> = {}): NotulenRij => ({
  meetingId: "m1",
  stap,
  opnameId: null,
  tekst: null,
  paginaUrl: null,
  fout: null,
  conceptUrl: null,
  slackTekst: null,
  gedeeldUrl: null,
  actiesUit: false,
  ...extra,
});
const stand = (
  r: NotulenRij | undefined,
  nu = eind + UUR,
  m: Parameters<typeof notulenStatus>[0] = meeting,
) => {
  const status = notulenStatus(m, r, eind - UUR, nu);
  return status && `${status.stand} ${status.tekst}`;
};

test("geen flow voor toekomst en meetings van vóór de start", () => {
  assert.strictEqual(
    stand(undefined, eind, { ...meeting, afgelopen: false }),
    null,
  );
  assert.strictEqual(
    notulenStatus(meeting, undefined, eind + 1, eind + UUR),
    null,
  );
  assert.strictEqual(stand(undefined), "open Wacht op opname");
});

test("geen opname of transcript na 4 uur is vastgelopen", () => {
  assert.strictEqual(stand(rij(1), eind + 3 * UUR), "open Wacht op opname");
  assert.strictEqual(
    stand(rij(1), eind + 5 * UUR),
    "warn Geen opname gevonden",
  );
  assert.strictEqual(
    stand(rij(2), eind + UUR),
    "jij Wacht op jou: auto-generate in Plaud",
  );
  assert.strictEqual(
    stand(rij(2), eind + 5 * UUR),
    "warn Transcript ontbreekt",
  );
  assert.strictEqual(
    notulenStatus(meeting, rij(2), null, eind + 5 * UUR)?.vast,
    true,
  );
});

test("dashboard bezig, klaar, fout en overgeslagen", () => {
  assert.strictEqual(stand(rij(3)), "open Claude maakt notulen");
  assert.strictEqual(stand(rij(4)), "open Naar Superhuman");
  assert.strictEqual(
    stand(rij(5, { actiesUit: true }), eind, { ...meeting, hoort: "prive" }),
    "ok Klaar",
  );
  assert.strictEqual(
    stand(rij(3, { fout: "Claude reageerde niet" })),
    "warn Notulen maken mislukt",
  );
  assert.strictEqual(
    stand(rij(2), eind, { ...meeting, overgeslagen: "serie" }),
    "muted Geen notulen",
  );
});

test("delen: intern wacht op Claude, dan op jou; extern op jou, dan op Gmail", () => {
  const extern = { ...meeting, extern: true };
  assert.strictEqual(stand(rij(5)), "open Claude schrijft het Slack-bericht");
  assert.strictEqual(
    stand(rij(5, { slackTekst: "Notulen staan klaar" })),
    "jij Wacht op jou: delen",
  );
  assert.strictEqual(stand(rij(5), eind, extern), "jij Wacht op jou: delen");
  assert.strictEqual(
    stand(rij(5, { conceptUrl: "https://mail.google.com/x" }), eind, extern),
    "jij Wacht op jou: verstuur in Gmail",
  );
  assert.strictEqual(
    stand(rij(6, { gedeeldUrl: "https://x", actiesUit: true })),
    "ok Klaar",
  );
  assert.strictEqual(
    stand(rij(5, { fout: "Claude reageerde niet" })),
    "warn Delen mislukt",
  );
});

test("delen: na 4 uur nog niet gedeeld is vastgelopen, privé nooit", () => {
  const status = notulenStatus(meeting, rij(5), null, eind + 5 * UUR);
  assert.strictEqual(status?.stand, "warn");
  assert.strictEqual(status?.tekst, "Nog niet gedeeld");
  assert.strictEqual(status?.vast, true);
  assert.strictEqual(
    stand(rij(5), eind + 3 * UUR, { ...meeting, extern: true }),
    "jij Wacht op jou: delen",
  );
  assert.strictEqual(
    stand(rij(5, { actiesUit: true }), eind + 5 * UUR, {
      ...meeting,
      hoort: "prive",
    }),
    "ok Klaar",
  );
});

test("actiepunten: klaar pas als de acties uitgelezen zijn, ook bij nul acties", () => {
  const prive = { ...meeting, hoort: "prive" };
  assert.strictEqual(stand(rij(6)), "open Actiepunten uitlezen");
  assert.strictEqual(stand(rij(5), eind, prive), "open Actiepunten uitlezen");
  const klaar = notulenStatus(meeting, rij(6, { actiesUit: true }), null, eind);
  assert.strictEqual(klaar?.stand, "ok");
  assert.strictEqual(klaar?.stap, 7);
  assert.strictEqual(
    notulenStatus(prive, rij(5, { actiesUit: true }), null, eind)?.stap,
    7,
  );
  // Nog niet gedeeld: uitgelezen acties maken een meeting niet klaar.
  assert.strictEqual(
    stand(rij(5, { actiesUit: true })),
    "open Claude schrijft het Slack-bericht",
  );
});
