import assert from "node:assert";
import { test } from "node:test";
import { deelGesprekkenIn, isGesprek } from "./gesprekken.ts";

const bericht = (id: string, user: string, ts: string) => ({
  channel: { id, is_im: true },
  user,
  ts,
});

test("het laatste bericht per gesprek bepaalt wie er aan de beurt is", () => {
  const dms = [
    bericht("D1", "andere", "3"),
    bericht("D1", "ik", "2"),
    bericht("D2", "ik", "5"),
    bericht("D2", "andere", "4"),
  ];
  const { wachtOpJou, beantwoord } = deelGesprekkenIn(
    dms,
    (b) => b.user === "ik",
  );
  assert.deepStrictEqual(wachtOpJou, [dms[0]]);
  assert.deepStrictEqual(beantwoord, ["D2"]);
});

test("een gesprek met een emoji-reactie of van een app is afgehandeld", () => {
  const dms = [
    bericht("D1", "andere", "3"),
    bericht("D2", "app", "5"),
    bericht("D3", "andere", "7"),
  ];
  const { wachtOpJou, beantwoord } = deelGesprekkenIn(
    dms,
    (b) => b.user === "app" || b.ts === "3",
  );
  assert.deepStrictEqual(wachtOpJou, [dms[2]]);
  assert.deepStrictEqual(beantwoord, ["D1", "D2"]);
});

test("alleen DM's en groeps-DM's zijn een gesprek", () => {
  assert.ok(isGesprek({ channel: { is_im: true } }));
  assert.ok(isGesprek({ channel: { is_mpim: true } }));
  assert.ok(!isGesprek({ channel: { name: "algemeen" } }));
  assert.ok(!isGesprek({}));
});
