import assert from "node:assert";
import { test } from "node:test";
import { beoordeelGesprek, decodeer, parseVan } from "./gesprekken.ts";

const IK = "ik@norday.nl";
const niemand = () => false;

const bericht = (
  van: string,
  aan: string,
  labelIds: string[] = ["INBOX"],
  cc = "",
) => ({
  labelIds,
  internalDate: "1760000000000",
  snippet: "Kun je hier naar kijken? Het is &#39;dringend&#39; &amp; snel",
  payload: {
    headers: [
      { name: "From", value: van },
      { name: "To", value: aan },
      { name: "Cc", value: cc },
      { name: "Subject", value: "Offerte" },
    ],
  },
});

const thread = (...messages: ReturnType<typeof bericht>[]) => ({
  id: "t1",
  messages,
});

test("de laatste mail van een ander bepaalt het item", () => {
  const item = beoordeelGesprek(
    thread(
      bericht(IK, "klant@voorbeeld.nl", ["SENT"]),
      bericht('"Klant Jansen" <Klant@Voorbeeld.nl>', `Ik <${IK}>`),
    ),
    IK,
    niemand,
  );
  assert.deepStrictEqual(item, {
    id: "t1",
    onderwerp: "Offerte",
    tekst: "Kun je hier naar kijken? Het is 'dringend' & snel",
    naam: "Klant Jansen",
    adres: "klant@voorbeeld.nl",
    tijd: 1760000000,
    soort: "Aan",
  });
});

test("na een eigen antwoord is het gesprek beantwoord; een concept telt niet", () => {
  const vraag = bericht("klant@voorbeeld.nl", IK);
  assert.strictEqual(
    beoordeelGesprek(
      thread(vraag, bericht(IK, "klant@voorbeeld.nl", ["SENT"])),
      IK,
      niemand,
    ),
    null,
  );
  assert.strictEqual(
    beoordeelGesprek(
      thread(vraag, bericht(IK, "klant@voorbeeld.nl", ["DRAFT"])),
      IK,
      niemand,
    )?.soort,
    "Aan",
  );
});

test("CC, niet geadresseerd en uitgesloten", () => {
  assert.strictEqual(
    beoordeelGesprek(
      thread(bericht("a@b.nl", "c@d.nl", ["INBOX"], IK)),
      IK,
      niemand,
    )?.soort,
    "CC",
  );
  assert.strictEqual(
    beoordeelGesprek(thread(bericht("a@b.nl", "team@norday.nl")), IK, niemand),
    null,
  );
  assert.strictEqual(
    beoordeelGesprek(
      thread(bericht("a@b.nl", IK)),
      IK,
      (adres) => adres === "a@b.nl",
    ),
    null,
  );
});

test("een gearchiveerd gesprek (zonder Postvak IN) wacht niet meer", () => {
  assert.strictEqual(
    beoordeelGesprek(thread(bericht("a@b.nl", IK, [])), IK, niemand),
    null,
  );
});

test("met een ster komt het er altijd in, met de laatste mail van een ander", () => {
  const item = beoordeelGesprek(
    thread(
      bericht("Ander <a@b.nl>", IK, ["STARRED"]),
      bericht(IK, "a@b.nl", ["SENT"]),
    ),
    IK,
    () => true,
  );
  assert.strictEqual(item?.soort, "Ster");
  assert.deepStrictEqual([item?.naam, item?.adres], ["Ander", "a@b.nl"]);
});

test("afzender en entities", () => {
  assert.deepStrictEqual(parseVan("jan@b.nl"), {
    naam: "jan@b.nl",
    adres: "jan@b.nl",
  });
  assert.deepStrictEqual(parseVan("Jan <jan@b.nl>"), {
    naam: "Jan",
    adres: "jan@b.nl",
  });
  assert.strictEqual(
    decodeer("&lt;a&gt; &#x27;b&#x27; &onbekend;"),
    "<a> 'b' &onbekend;",
  );
});
