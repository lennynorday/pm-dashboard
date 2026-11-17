const INTERVAL_MS = 5 * 60 * 1000;

// Alleen productie (npm run serve): de staging-omgeving op 3000 maakt geen notulen vanzelf.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { notulenAan, verwerkAlleNotulen } = await import("./lib/notulen");
  if (!notulenAan()) return;
  setInterval(() => {
    verwerkAlleNotulen().catch((fout) =>
      console.error("Notulen-timer mislukt:", fout),
    );
  }, INTERVAL_MS);
}
