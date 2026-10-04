import { connection } from "next/server";
import { callOrbitTool } from "@/lib/orbit/client";
import styles from "./page.module.css";

// Tijdelijke testpagina voor fase 0: bewijst dat de app zelf data uit Orbit haalt.
const TEST_PROJECT_NUMBER = "1607";

export default async function OrbitTestPage() {
  await connection();
  const result = await callOrbitTool("GetProjectFinancials", {
    projectId: TEST_PROJECT_NUMBER,
  });

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Orbit-test</h1>
      {result.status === "niet-verbonden" && (
        <p>
          De app is nog niet verbonden met Orbit.{" "}
          <a href="/api/orbit/login">Inloggen bij Orbit</a>
        </p>
      )}
      {result.status === "fout" && (
        <p role="alert">Ophalen uit Orbit is mislukt: {result.message}</p>
      )}
      {result.status === "ok" && (
        <>
          <p>Opgehaald op {new Date().toLocaleString("nl-NL")}</p>
          <pre className={styles.output}>{result.text}</pre>
        </>
      )}
    </main>
  );
}
