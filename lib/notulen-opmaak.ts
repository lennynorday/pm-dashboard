/**
 * Notulen tussen Markdown (zo bewaart het dashboard ze en zo gaan ze naar
 * Superhuman) en HTML (het rich-text-veld). Alleen wat notulen gebruiken:
 * alinea's, koppen, opsommingen, genummerde lijsten, vet en cursief.
 */

const ontsnap = (tekst: string) =>
  tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Vet (**x**) en cursief (*x* of _x_) binnen een regel, als veilige HTML. */
function inline(regel: string): string {
  return ontsnap(regel)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1<em>$2</em>");
}

/** Markdown naar HTML voor het rich-text-veld; alle tekst wordt ontsnapt. */
export function mdNaarHtml(md: string): string {
  const uit: string[] = [];
  let lijst: "ul" | "ol" | null = null;
  let alinea: string[] = [];
  const sluitAlinea = () => {
    if (alinea.length) uit.push(`<p>${alinea.join("<br>")}</p>`);
    alinea = [];
  };
  const sluitLijst = () => {
    if (lijst) uit.push(`</${lijst}>`);
    lijst = null;
  };
  for (const ruw of md.split("\n")) {
    const regel = ruw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(regel);
    const nummer = /^\d+[.)]\s+(.*)$/.exec(regel);
    const item = bullet ?? nummer;
    if (item) {
      sluitAlinea();
      const soort = bullet ? "ul" : "ol";
      if (lijst !== soort) {
        sluitLijst();
        uit.push(`<${soort}>`);
        lijst = soort;
      }
      uit.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    sluitLijst();
    if (!regel) {
      sluitAlinea();
      continue;
    }
    if (regel.startsWith("#")) {
      sluitAlinea();
      uit.push(`<h3>${inline(regel.replace(/^#+\s*/, ""))}</h3>`);
      continue;
    }
    alinea.push(inline(regel));
  }
  sluitAlinea();
  sluitLijst();
  return uit.join("");
}

/** Wat htmlNaarMd van een DOM-knoop nodig heeft; zo is het zonder browser te testen. */
export type Knoop = {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<Knoop>;
};

const TEKST = 3;
const BLOKKEN = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "UL", "OL", "LI"]);

/** Zet markeringen om de tekst, met spaties erbuiten: "** x**" is in Markdown geen vet. */
function markeer(binnen: string, teken: string): string {
  const [, voor, kern, na] = /^(\s*)([\s\S]*?)(\s*)$/.exec(binnen) ?? [];
  return kern ? `${voor}${teken}${kern}${teken}${na}` : binnen;
}

function inlineMd(knoop: Knoop): string {
  if (knoop.nodeType === TEKST)
    return (knoop.textContent ?? "").replace(/\s+/g, " ");
  const binnen = Array.from(knoop.childNodes).map(inlineMd).join("");
  switch (knoop.nodeName) {
    case "BR":
      return "\n";
    case "B":
    case "STRONG":
      return markeer(binnen, "**");
    case "I":
    case "EM":
      return markeer(binnen, "*");
    default:
      return binnen;
  }
}

/** Regels van een blok: tekst met <br> wordt meerdere regels. */
const regels = (knoop: Knoop) =>
  inlineMd(knoop)
    .split("\n")
    .map((regel) => regel.trim())
    .filter(Boolean);

/**
 * Het rich-text-veld terug naar Markdown. Blokken met een lege regel ertussen;
 * een regelafbreking binnen een alinea wordt "  \n", zoals in het notulenformat.
 */
export function htmlNaarMd(veld: Knoop): string {
  const blokken: string[] = [];
  let los: Knoop[] = [];
  const sluitLos = () => {
    const tekst = regels({
      nodeType: 1,
      nodeName: "SPAN",
      textContent: null,
      childNodes: los,
    });
    if (tekst.length) blokken.push(tekst.join("  \n"));
    los = [];
  };
  for (const knoop of Array.from(veld.childNodes)) {
    if (!BLOKKEN.has(knoop.nodeName)) {
      los.push(knoop);
      continue;
    }
    sluitLos();
    blokken.push(...blokMd(knoop));
  }
  sluitLos();
  return blokken.filter(Boolean).join("\n\n");
}

function blokMd(knoop: Knoop): string[] {
  if (knoop.nodeName === "UL" || knoop.nodeName === "OL") {
    const items = Array.from(knoop.childNodes)
      .filter((kind) => kind.nodeName === "LI")
      .map((li, index) => {
        const tekst = regels(li).join(" ");
        return knoop.nodeName === "OL" ? `${index + 1}. ${tekst}` : `- ${tekst}`;
      });
    return [items.join("\n")];
  }
  if (/^H\d$/.test(knoop.nodeName)) return [`## ${regels(knoop).join(" ")}`];
  // Een <div> of <p> met zelf blokken erin (zoals Chrome soms maakt): die blokken los.
  if (Array.from(knoop.childNodes).some((kind) => BLOKKEN.has(kind.nodeName)))
    return [htmlNaarMd(knoop)];
  return [regels(knoop).join("  \n")];
}
