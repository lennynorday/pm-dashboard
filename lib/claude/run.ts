import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { SYSTEEMPROMPT } from "./prompt";

const CLAUDE =
  process.env.CLAUDE_PAD ?? path.join(homedir(), ".local", "bin", "claude");
export const TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Slank en zonder rechten: sonnet, geen tools (dus ook niets dat kan versturen of
 * schrijven), geen MCP's, geen skills, hooks of CLAUDE.md (--safe-mode), geen
 * sessiebestand. De prompt gaat via stdin.
 */
const ARGS = [
  "-p",
  "--output-format",
  "json",
  "--model",
  "sonnet",
  "--safe-mode",
  "--strict-mcp-config",
  "--tools",
  "",
  "--no-session-persistence",
  "--system-prompt",
  SYSTEEMPROMPT,
];

export type Run = { stdout: string } | { fout: string };

/** Draait Claude Code met de prompt, in een lege tijdelijke map zodat de repo niet meeladen. */
export async function draaiClaude(prompt: string): Promise<Run> {
  const map = await mkdtemp(path.join(tmpdir(), "pm-claude-"));
  try {
    return await new Promise<Run>((klaar) => {
      const proces = spawn(CLAUDE, ARGS, {
        cwd: map,
        timeout: TIMEOUT_MS,
        killSignal: "SIGKILL",
      });
      let stdout = "";
      let stderr = "";
      proces.stdout.on("data", (deel: Buffer) => (stdout += deel));
      proces.stderr.on("data", (deel: Buffer) => (stderr += deel));
      proces.stdin.on("error", () => {});
      proces.on("error", (fout: NodeJS.ErrnoException) =>
        klaar({
          fout:
            fout.code === "ENOENT"
              ? "Claude Code niet gevonden"
              : `Claude Code starten mislukte: ${fout.message}`,
        }),
      );
      proces.on("close", (code, signaal) => {
        if (signaal) {
          return klaar({ fout: "Claude reageerde niet binnen 3 minuten" });
        }
        if (code !== 0 && !stdout.trim()) {
          return klaar({
            fout:
              stderr.trim().slice(0, 300) || `Claude stopte met code ${code}`,
          });
        }
        klaar({ stdout });
      });
      proces.stdin.end(prompt);
    });
  } finally {
    await rm(map, { recursive: true, force: true });
  }
}
