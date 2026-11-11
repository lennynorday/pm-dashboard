/** Een stap verder in de notulen-flow, alleen als de rij nog zo staat als de run hem aantrof. Zonder database-import, zodat dit los te testen is. */
import type { DatabaseSync } from "node:sqlite";

/** Hoe een run de meeting aantrof: is de rij intussen teruggezet (andere opname), dan telt het resultaat niet. */
export type Verwacht = { stap: number; opnameId: string | null };

/** Zet de meeting een stap verder; false als de rij niet meer op `verwacht` staat. */
export function zetStap(
  db: DatabaseSync,
  email: string,
  id: string,
  stap: number,
  verwacht: Verwacht,
  velden: Partial<
    Record<"opname_id" | "tekst" | "pagina_url" | "weggelaten", string>
  > = {},
): boolean {
  const { changes } = db
    .prepare(
      `UPDATE notulen SET stap = ?, sinds = ?, bezig = NULL, fout = NULL,
         opname_id = COALESCE(?, opname_id), tekst = COALESCE(?, tekst),
         pagina_url = COALESCE(?, pagina_url),
         weggelaten = COALESCE(?, weggelaten)
       WHERE email = ? AND meeting_id = ? AND stap = ? AND opname_id IS ?`,
    )
    .run(
      stap,
      Date.now(),
      velden.opname_id ?? null,
      velden.tekst ?? null,
      velden.pagina_url ?? null,
      velden.weggelaten ?? null,
      email,
      id,
      verwacht.stap,
      verwacht.opnameId,
    );
  return changes === 1;
}

/** Zet een fout; met `verwacht` alleen als de rij nog zo staat als de run hem aantrof. */
export function zetFout(
  db: DatabaseSync,
  email: string,
  id: string,
  fout: string,
  verwacht?: Verwacht,
): void {
  const where = verwacht ? " AND stap = ? AND opname_id IS ?" : "";
  db.prepare(
    `UPDATE notulen SET fout = ?, bezig = NULL WHERE email = ? AND meeting_id = ?${where}`,
  ).run(
    fout.slice(0, 500),
    email,
    id,
    ...(verwacht ? [verwacht.stap, verwacht.opnameId] : []),
  );
}
