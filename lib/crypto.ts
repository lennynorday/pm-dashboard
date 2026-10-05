import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("TOKEN_ENCRYPTION_KEY ontbreekt in .env.local");
  const buffer = Buffer.from(value, "base64");
  if (buffer.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY moet 32 bytes zijn, base64");
  }
  return buffer;
}

/** Versleutelt tekst; het resultaat bevat iv, tag en data, gescheiden door punten. */
export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}

/** Ontsleutelt wat encrypt maakte; gooit een fout als er iets aan is veranderd. */
export function decrypt(value: string): string {
  const [iv, tag, data] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
