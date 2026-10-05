import { createHash, randomBytes } from "node:crypto";

export type Pkce = { verifier: string; challenge: string; state: string };

/** Verifier, challenge en state voor een OAuth-login met PKCE. */
export function pkce(): Pkce {
  const verifier = randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: randomBytes(16).toString("base64url"),
  };
}
