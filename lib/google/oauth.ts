import { pkce, Pkce } from "@/lib/pkce";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const GOOGLE_REDIRECT_URI = "http://localhost:3000/api/google/callback";

/** Alleen Google-accounts van dit domein mogen inloggen. */
export const NORDAY_DOMEIN = "norday.nl";

export type GoogleProfiel = {
  email: string;
  naam: string;
  voornaam: string;
  foto: string | null;
};

/** Het account is geldig, maar hoort niet bij Norday. */
export class GeenNordayAccountError extends Error {
  constructor() {
    super(`Alleen accounts op ${NORDAY_DOMEIN} kunnen inloggen`);
  }
}

function setting(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt in .env.local`);
  return value;
}

export function startLogin(): Pkce & { authorizeUrl: string } {
  const login = pkce();
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: setting("GOOGLE_CLIENT_ID"),
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: login.challenge,
    code_challenge_method: "S256",
    state: login.state,
    hd: NORDAY_DOMEIN,
    prompt: "select_account",
  }).toString();
  return { ...login, authorizeUrl: url.toString() };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Parst het ID-token. Het komt rechtstreeks via TLS van Google's token-endpoint,
 * dus de handtekening hoeft niet apart gecontroleerd te worden (OpenID Connect
 * Core 3.1.3.7); de inhoud wel.
 */
export function parseIdToken(
  idToken: string,
  clientId: string,
  now: number,
): GoogleProfiel {
  const payload: unknown = JSON.parse(
    Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"),
  );
  const claims =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  if (claims.aud !== clientId || !ISSUERS.includes(String(claims.iss))) {
    throw new Error("Het ID-token van Google is niet voor deze app");
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 < now) {
    throw new Error("Het ID-token van Google is verlopen");
  }
  const email = text(claims.email);
  if (!email || claims.email_verified !== true) {
    throw new Error("Google gaf geen bevestigd e-mailadres");
  }
  if (claims.hd !== NORDAY_DOMEIN) throw new GeenNordayAccountError();

  const naam = text(claims.name) ?? email;
  return {
    email,
    naam,
    voornaam: text(claims.given_name) ?? naam.split(" ")[0],
    foto: text(claims.picture),
  };
}

export async function exchangeCode(
  code: string,
  verifier: string,
): Promise<GoogleProfiel> {
  const clientId = setting("GOOGLE_CLIENT_ID");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: clientId,
      client_secret: setting("GOOGLE_CLIENT_SECRET"),
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google gaf status ${response.status} bij het inloggen`);
  }
  const data: unknown = await response.json();
  const idToken =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).id_token
      : undefined;
  if (typeof idToken !== "string") {
    throw new Error("Google gaf geen ID-token terug");
  }
  return parseIdToken(idToken, clientId, Date.now());
}
