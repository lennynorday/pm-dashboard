import assert from "node:assert";
import { test } from "node:test";
import { bouwAntwoord, metRe } from "./antwoord.ts";

const ontleed = (raw: string) => {
  const [koppen, ...rest] = Buffer.from(raw, "base64url")
    .toString("utf8")
    .split("\r\n\r\n");
  return {
    koppen: Object.fromEntries(
      koppen
        .split("\r\n")
        .map((regel) => [
          regel.slice(0, regel.indexOf(": ")),
          regel.slice(regel.indexOf(": ") + 2),
        ]),
    ),
    tekst: Buffer.from(rest.join("").replace(/\r\n/g, ""), "base64").toString(
      "utf8",
    ),
  };
};

test("Re: komt er maar één keer voor", () => {
  assert.strictEqual(metRe("Offerte"), "Re: Offerte");
  assert.strictEqual(metRe("Re: Offerte"), "Re: Offerte");
  assert.strictEqual(metRe("RE: Offerte"), "RE: Offerte");
});

test("het antwoord heeft de headers van een antwoord en een base64url-body", () => {
  const { koppen, tekst } = ontleed(
    bouwAntwoord({
      aan: "klant@voorbeeld.nl",
      onderwerp: "Offerte",
      tekst: "Dag Jan,\n\nDank voor je mail. Groet",
      inReplyTo: "<b@mail.voorbeeld.nl>",
      references: "<a@mail.voorbeeld.nl>",
    }),
  );
  assert.strictEqual(koppen.To, "klant@voorbeeld.nl");
  assert.strictEqual(koppen.Subject, "Re: Offerte");
  assert.strictEqual(koppen["In-Reply-To"], "<b@mail.voorbeeld.nl>");
  assert.strictEqual(
    koppen.References,
    "<a@mail.voorbeeld.nl> <b@mail.voorbeeld.nl>",
  );
  assert.strictEqual(tekst, "Dag Jan,\n\nDank voor je mail. Groet");
  assert.ok(
    !/[+/=]/.test(
      bouwAntwoord({
        aan: "a@b.nl",
        onderwerp: "x",
        tekst: "ÿÿÿ??>>",
        inReplyTo: null,
        references: null,
      }),
    ),
  );
});

test("niet-ASCII onderwerp wordt gecodeerd en regeleinden in headers verdwijnen", () => {
  const { koppen } = ontleed(
    bouwAntwoord({
      aan: "a@b.nl\r\nBcc: stil@voorbeeld.nl",
      onderwerp: "Café offerte",
      tekst: "Hoi",
      inReplyTo: null,
      references: null,
    }),
  );
  assert.ok(koppen.Subject.startsWith("=?UTF-8?B?"));
  assert.strictEqual(koppen.To, "a@b.nl Bcc: stil@voorbeeld.nl");
  assert.strictEqual(koppen.Bcc, undefined);
  assert.strictEqual(koppen["In-Reply-To"], undefined);
});
