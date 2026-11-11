import assert from "node:assert";
import { test } from "node:test";
import { titelSuggestie } from "./titel-suggestie.ts";

test("mail: onderwerp zonder Re/Fwd", () => {
  assert.equal(
    titelSuggestie("gmail", "Re: FW: DNS toevoeging"),
    "DNS toevoeging",
  );
  assert.equal(titelSuggestie("gmail", "Antw: Update"), "Update");
});

test("slack: eerste zin, zonder vermeldingen en emoji", () => {
  assert.equal(
    titelSuggestie(
      "slack",
      "@Lennart ter Haar-Elshout ik wil morgenochtend de planning doornemen. Lukt dat? :pray:",
    ),
    "ik wil morgenochtend de planning doornemen.",
  );
  assert.equal(titelSuggestie("slack", ":point_up_2:"), "");
  assert.equal(
    titelSuggestie("slack", "@Sam de deploy naar acc staat klaar"),
    "de deploy naar acc staat klaar",
  );
});
