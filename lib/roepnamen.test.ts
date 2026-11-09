import assert from "node:assert/strict";
import test from "node:test";
import { normaliseerRoepnamen, roepnaamConflict } from "./roepnamen.ts";

test("normaliseerRoepnamen: spaties, lege items en dubbelen", () => {
  assert.deepStrictEqual(normaliseerRoepnamen(" CMU ,, kh ,KH, "), [
    "CMU",
    "kh",
  ]);
  assert.deepStrictEqual(normaliseerRoepnamen(""), []);
  assert.deepStrictEqual(normaliseerRoepnamen(["A", " a", ""]), ["A"]);
});

test("roepnaamConflict: hoofdletterongevoelig, met de naam van het andere platform", () => {
  const anderen = [{ naam: "Kunsthal", roepnamen: ["KH"] }];
  assert.strictEqual(
    roepnaamConflict(["kh"], anderen),
    "kh hoort al bij Kunsthal",
  );
  assert.strictEqual(roepnaamConflict(["TWO"], anderen), null);
  assert.strictEqual(roepnaamConflict([], anderen), null);
});
