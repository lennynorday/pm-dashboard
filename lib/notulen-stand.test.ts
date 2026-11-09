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
} as const;
const rij = (stap: number, extra: Partial<NotulenRij> = {}): NotulenRij => ({
  meetingId: "m1",
  stap,
  opnameId: null,
  tekst: null,
  paginaUrl: null,
  fout: null,
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

test("geen flow voor Focus, toekomst en meetings van vóór de start", () => {
  assert.strictEqual(
    stand(undefined, eind, { ...meeting, hoort: "focus" }),
    null,
  );
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
  assert.strictEqual(stand(rij(5)), "jij Wacht op jou: delen");
  assert.strictEqual(
    stand(rij(5), eind, { ...meeting, hoort: "prive" }),
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
