import { spawn } from "node:child_process";

/** Een opname in het gedeelde Plaud-account, zoals `plaud recent` hem toont. */
export type Opname = { id: string; naam: string; datum: string };

/** Wat `plaud file` over een opname zegt. */
export type OpnameDetails = {
  id: string;
  /** Begin in ms (UTC). */
  start: number;
  duurMs: number;
  transcript: boolean;
};

const PLAUD = process.env.PLAUD_PAD ?? "/opt/homebrew/bin/plaud";
const TIMEOUT_MS = 60_000;

/** "37m30s", "1h02m03s" of "45s" naar ms; 0 als het niet te lezen is. */
export function parseDuur(tekst: string): number {
  const deel = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(tekst.trim());
  if (!deel || !deel[0]) return 0;
  const [, uren = "0", minuten = "0", seconden = "0"] = deel;
  return (Number(uren) * 3600 + Number(minuten) * 60 + Number(seconden)) * 1000;
}

/** De regels van `plaud recent`: "  of_<32 hex>  <naam>  <YYYY-MM-DD>  37m30s". De naam mag spaties bevatten. */
export function parseRecent(tekst: string): Opname[] {
  return tekst.split("\n").flatMap((regel) => {
    const deel =
      /^\s+(of_[0-9a-f]{32})\s{2,}(.*?)\s{2,}(\d{4}-\d{2}-\d{2})\s{2,}\S+\s*$/.exec(
        regel,
      );
    return deel ? [{ id: deel[1], naam: deel[2], datum: deel[3] }] : [];
  });
}

/** De velden van `plaud file`; start_at is UTC zonder Z. Null als id of start ontbreekt. */
export function parseFile(tekst: string): OpnameDetails | null {
  const velden = new Map(
    tekst.split("\n").flatMap((regel) => {
      const deel = /^\s+([a-z_]+):\s+(.*?)\s*$/.exec(regel);
      return deel ? [[deel[1], deel[2]] as const] : [];
    }),
  );
  const id = velden.get("id");
  const start = Date.parse(`${velden.get("start_at") ?? ""}Z`);
  if (!id || Number.isNaN(start)) return null;
  return {
    id,
    start,
    duurMs: parseDuur(velden.get("duration") ?? ""),
    transcript: velden.get("transcript") === "available",
  };
}

/** Alleen de regels "[00:04 - 01:03] Speaker 1: tekst"; leeg als er geen transcript is. */
export function parseTranscript(tekst: string): string {
  return tekst
    .split("\n")
    .filter((regel) => /^\[\d+:\d{2}/.test(regel))
    .join("\n");
}

/**
 * De opname die het langst overlapt met de meeting; null als er geen overlapt.
 * Het account is gedeeld, dus alleen tijd telt, niet de naam.
 */
export function kiesOpname(
  meeting: { start: number; eind: number },
  opnames: OpnameDetails[],
): OpnameDetails | null {
  let beste: OpnameDetails | null = null;
  let meeste = 0;
  for (const opname of opnames) {
    const overlap =
      Math.min(meeting.eind, opname.start + opname.duurMs) -
      Math.max(meeting.start, opname.start);
    if (overlap > meeste) {
      beste = opname;
      meeste = overlap;
    }
  }
  return beste;
}

type Uitkomst = { stdout: string } | { fout: string };

/** Draait de Plaud CLI (alleen lezende commando's); fouten staan op stderr. */
function plaud(args: string[]): Promise<Uitkomst> {
  return new Promise((klaar) => {
    // next dev zet FORCE_COLOR=1; met kleurcodes in de uitvoer herkennen de parsers niets.
    const proces = spawn(PLAUD, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    let verlopen = false;
    const timer = setTimeout(() => {
      verlopen = true;
      proces.kill("SIGKILL");
    }, TIMEOUT_MS);
    let stdout = "";
    let stderr = "";
    proces.stdout.on("data", (deel: Buffer) => (stdout += deel));
    proces.stderr.on("data", (deel: Buffer) => (stderr += deel));
    proces.on("error", (fout: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      klaar({
        fout:
          fout.code === "ENOENT"
            ? "Plaud CLI niet gevonden"
            : `Plaud CLI starten mislukte: ${fout.message}`,
      });
    });
    proces.on("close", (code) => {
      clearTimeout(timer);
      if (verlopen)
        return klaar({ fout: "Plaud reageerde niet binnen 1 minuut" });
      // Voortgangsregels als "- Fetching …" staan ook op stderr; die zijn geen fout.
      const melding = stderr
        .split("\n")
        .filter((regel) => regel.trim() && !regel.startsWith("- "))
        .join(" ")
        .trim();
      if (code !== 0) {
        return klaar({
          fout: `Plaud gaf een fout: ${melding.slice(0, 300) || `code ${code}`}`,
        });
      }
      klaar({ stdout });
    });
  });
}

export async function recenteOpnames(
  dagen: number,
): Promise<Opname[] | { fout: string }> {
  const uit = await plaud(["recent", "--days", String(dagen)]);
  return "fout" in uit ? uit : parseRecent(uit.stdout);
}

export async function opnameDetails(
  id: string,
): Promise<OpnameDetails | { fout: string }> {
  const uit = await plaud(["file", id]);
  if ("fout" in uit) return uit;
  return parseFile(uit.stdout) ?? { fout: "Plaud gaf geen leesbare opname" };
}

/** Het opgeschoonde transcript, anders het gewone; leeg als er (nog) geen is. */
export async function leesTranscript(
  id: string,
): Promise<string | { fout: string }> {
  const opgeschoond = await plaud(["transcript", "--polished", id]);
  if ("fout" in opgeschoond) return opgeschoond;
  const tekst = parseTranscript(opgeschoond.stdout);
  if (tekst) return tekst;
  const gewoon = await plaud(["transcript", id]);
  return "fout" in gewoon ? gewoon : parseTranscript(gewoon.stdout);
}
