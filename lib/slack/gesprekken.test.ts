import assert from "node:assert";
import { test } from "node:test";
import {
  beantwoordInThread,
  deelGesprekkenIn,
  isGesprek,
} from "./gesprekken.ts";

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
  assert.deepStrictEqual(wachtOpJou, [[dms[0]]]);
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
  assert.deepStrictEqual(wachtOpJou, [[dms[2]]]);
  assert.deepStrictEqual(beantwoord, ["D1", "D2"]);
});

test("losse berichten na je laatste reactie komen samen binnen", () => {
  const dms = [
    bericht("D1", "andere", "5"),
    bericht("D1", "andere", "4"),
    bericht("D1", "ik", "3"),
    bericht("D1", "andere", "2"),
  ];
  const { wachtOpJou } = deelGesprekkenIn(dms, (b) => b.user === "ik");
  assert.deepStrictEqual(wachtOpJou, [[dms[0], dms[1]]]);
});

test("alleen DM's en groeps-DM's zijn een gesprek", () => {
  assert.ok(isGesprek({ channel: { is_im: true } }));
  assert.ok(isGesprek({ channel: { is_mpim: true } }));
  assert.ok(!isGesprek({ channel: { name: "algemeen" } }));
  assert.ok(!isGesprek({}));
});

test("een vermelding is beantwoord als je daarna in dezelfde thread schreef", () => {
  const link = (ts: string, thread?: string) =>
    `https://x.slack.com/archives/C1/p${ts}${thread ? `?thread_ts=${thread}` : ""}`;
  const inThread = (ts: string, thread?: string) => ({
    channel: { id: "C1" },
    ts,
    permalink: link(ts, thread),
  });
  const beantwoord = beantwoordInThread([inThread("20", "10"), inThread("30")]);
  assert.ok(beantwoord(inThread("15", "10")), "antwoord later in de thread");
  assert.ok(
    beantwoord(inThread("10")),
    "vermelding is het begin van de thread",
  );
  assert.ok(!beantwoord(inThread("25", "10")), "jouw antwoord was eerder");
  assert.ok(!beantwoord(inThread("5")), "los bericht in het kanaal telt niet");
});
