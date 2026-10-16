import assert from "node:assert";
import { test } from "node:test";
import {
  isSla,
  looptijdProcent,
  regelStatus,
  slaStatus,
} from "./budgetsignaal.ts";

test("regelStatus: te veel gepland, ongepland of vrij", () => {
  assert.deepStrictEqual(regelStatus(600, 300, 400), {
    soort: "rood",
    icoon: "alert",
    tekst: "1,7u te veel gepland",
  });
  assert.strictEqual(regelStatus(600, 300, 302).tekst, "0u vrij");
  assert.strictEqual(regelStatus(600, 100, 0).tekst, "8,3u ongepland");
  assert.strictEqual(regelStatus(600, 100, 0).soort, "open");
  assert.deepStrictEqual(regelStatus(600, 300, 270), {
    soort: "ok",
    icoon: "check",
    tekst: "0,5u vrij",
  });
});

test("slaStatus: voor, achter of op schema", () => {
  // pot 100u, halverwege: 50u hoort geschreven te zijn
  assert.strictEqual(slaStatus(6000, 3900, 50).tekst, "15u voor op schema");
  assert.strictEqual(slaStatus(6000, 3900, 50).soort, "rood");
  assert.strictEqual(slaStatus(6000, 2100, 50).tekst, "15u achter op schema");
  assert.strictEqual(slaStatus(6000, 2100, 50).soort, "open");
  assert.deepStrictEqual(slaStatus(6000, 3100, 50), {
    soort: "ok",
    icoon: "check",
    tekst: "Op schema",
  });
});

test("looptijdProcent: vanaf 1 januari of een latere start, t/m 31 december", () => {
  const vandaag = new Date(2026, 9, 15);
  assert.strictEqual(looptijdProcent("2026-01-01", vandaag), 79);
  assert.strictEqual(looptijdProcent(null, vandaag), 79);
  assert.strictEqual(looptijdProcent("2025-06-01", vandaag), 79);
  assert.strictEqual(looptijdProcent("2026-10-01", vandaag), 15);
});

test("isSla: alleen het losse woord SLA", () => {
  assert.strictEqual(isSla("Kunsthal SLA 2026 Q4"), true);
  assert.strictEqual(isSla("Effenaar / sla 2026"), true);
  assert.strictEqual(isSla("Glasland"), false);
});
