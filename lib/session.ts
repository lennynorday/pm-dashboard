import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { database } from "./db";
import type { GoogleProfiel } from "./google/oauth";

export const SESSIE_COOKIE = "pm-sessie";
export const SESSIE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;

/** Waarom inloggen mislukte; kort bewaard zodat het inlogscherm het kan tonen. */
export const LOGIN_MELDING_COOKIE = "pm-login-melding";
export type LoginMelding = "geen-norday-account" | "mislukt";

export type Gebruiker = GoogleProfiel;

/** In de database staat alleen een hash, zodat een gelekte database geen sessies prijsgeeft. */
function hash(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

function parseGebruiker(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  const { email, naam, voornaam, foto } = row;
  if (
    typeof email !== "string" ||
    typeof naam !== "string" ||
    typeof voornaam !== "string"
  ) {
    return null;
  }
  return {
    email,
    naam,
    voornaam,
    foto: typeof foto === "string" ? foto : null,
  };
}

/** Slaat het profiel op en start een sessie; geeft het sessie-id voor de cookie. */
export function startSessie(profiel: GoogleProfiel): string {
  const db = database();
  db.prepare(
    `INSERT INTO gebruikers (email, naam, voornaam, foto) VALUES (?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET naam = excluded.naam,
       voornaam = excluded.voornaam, foto = excluded.foto`,
  ).run(profiel.email, profiel.naam, profiel.voornaam, profiel.foto);

  const id = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO sessies (id_hash, email, aangemaakt) VALUES (?, ?, ?)",
  ).run(hash(id), profiel.email, Date.now());
  return id;
}

export function stopSessie(id: string): void {
  database().prepare("DELETE FROM sessies WHERE id_hash = ?").run(hash(id));
}

/** De ingelogde gebruiker van dit verzoek, of null. */
export const currentUser = cache(async (): Promise<Gebruiker | null> => {
  const id = (await cookies()).get(SESSIE_COOKIE)?.value;
  if (!id) return null;
  const row = database()
    .prepare(
      `SELECT g.email, g.naam, g.voornaam, g.foto
       FROM sessies s JOIN gebruikers g ON g.email = s.email
       WHERE s.id_hash = ?`,
    )
    .get(hash(id));
  return parseGebruiker(row);
});
