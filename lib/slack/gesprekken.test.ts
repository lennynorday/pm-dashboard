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
  const { wachtOpJou, beantwoord } = deelGesprekkenIn(dms, "ik");
  assert.deepStrictEqual(wachtOpJou, [dms[0]]);
  assert.deepStrictEqual(beantwoord, ["D2"]);
});

test("alleen DM's en groeps-DM's zijn een gesprek", () => {
  assert.ok(isGesprek({ channel: { is_im: true } }));
  assert.ok(isGesprek({ channel: { is_mpim: true } }));
  assert.ok(!isGesprek({ channel: { name: "algemeen" } }));
  assert.ok(!isGesprek({}));
});
