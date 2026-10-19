import assert from "node:assert";
import { test } from "node:test";
import { parseUitvoer } from "./voorstel.ts";

const envelop = (result: string, is_error = false) =>
  JSON.stringify({ type: "result", is_error, result });

test("een geldig object, ook in een codeblok, wordt een voorstel", () => {
  const object = {
    soort: "gmail-concept",
    ontvanger: "klant@voorbeeld.nl",
    onderwerp: "Re: Offerte",
    tekst: "Dag Jan, dank voor je mail.",
  };
  const uitkomst = {
    voorstel: { ...object },
  };
  assert.deepStrictEqual(
    parseUitvoer(envelop(JSON.stringify(object)), "gmail-concept"),
    uitkomst,
  );
  assert.deepStrictEqual(
    parseUitvoer(
      envelop(`Hier is het:\n\`\`\`json\n${JSON.stringify(object)}\n\`\`\``),
      "gmail-concept",
    ),
    uitkomst,
  );
});

test("een advies mag altijd, en krijgt geen ontvanger of onderwerp", () => {
  assert.deepStrictEqual(
    parseUitvoer(
      envelop('{"soort":"advies","ontvanger":"x@y.nl","tekst":"Bel hem."}'),
      "slack-concept",
    ),
    {
      voorstel: {
        soort: "advies",
        ontvanger: null,
        onderwerp: null,
        tekst: "Bel hem.",
      },
    },
  );
});

test("ongeldige JSON, lege tekst en een fout van Claude zijn mislukt", () => {
  const fout = (stdout: string) => "fout" in parseUitvoer(stdout, "advies");
  assert.ok(fout("geen json"));
  assert.ok(fout(envelop("ik denk dat je moet bellen")));
  assert.ok(fout(envelop("{kapot")));
  assert.ok(fout(envelop('{"soort":"advies","tekst":"  "}')));
  assert.ok(fout(envelop("Not logged in", true)));
});

test("een verkeerde of onbekende soort is mislukt", () => {
  assert.ok(
    "fout" in
      parseUitvoer(
        envelop('{"soort":"slack-concept","tekst":"Hoi"}'),
        "gmail-concept",
      ),
  );
  assert.ok(
    "fout" in parseUitvoer(envelop('{"soort":"sms","tekst":"Hoi"}'), "advies"),
  );
});
