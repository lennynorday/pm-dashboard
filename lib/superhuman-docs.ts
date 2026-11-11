/**
 * Pagina's in Superhuman-docs (Coda-compatibele API) met SUPERHUMAN_DOCS_TOKEN.
 * Alleen lezen en pagina's aanmaken: dit verwijdert nooit iets.
 */
const API = "https://docs.superhuman.com/apis/v1";

export type Pagina = {
  id: string;
  naam: string;
  parentId: string | null;
  link: string | null;
};

/** Het doc Lennys Dashboard, met de pagina Notulen voor Team en Privé. */
export const LENNYS_DASHBOARD = {
  docId: "bn7xvJsaKk",
  notulen: "canvas-IqRv6M5_7B",
};

/** Het doc-id uit een link als https://docs.superhuman.com/d/_dsOpoo6eGAx of /d/Naam_dAbc123/… */
export function docIdUitLink(url: string): string | null {
  const segment = /\/d\/([^/?#]+)/.exec(url)?.[1];
  const begin = segment?.lastIndexOf("_d") ?? -1;
  if (!segment || begin < 0) return null;
  return segment.slice(begin + 2) || null;
}

/**
 * Het korte pagina-id uit een paginalink: ".../_d1iIzGZvA6Q/_suOaNM9q" en
 * ".../Notulen-intern_suOaNM9q" geven allebei "OaNM9q". De API zet zo'n link niet om.
 */
export function paginaIdUitLink(url: string): string | null {
  const pad = URL.canParse(url) ? new URL(url).pathname : "";
  const segment = pad.split("/").filter(Boolean).at(-1) ?? "";
  const begin = segment.lastIndexOf("_su");
  if (begin < 0) return null;
  return segment.slice(begin + 3) || null;
}

const record = (waarde: unknown): Record<string, unknown> =>
  typeof waarde === "object" && waarde !== null && !Array.isArray(waarde)
    ? (waarde as Record<string, unknown>)
    : {};
const tekst = (waarde: unknown) => (typeof waarde === "string" ? waarde : null);

function parsePagina(data: unknown): Pagina | null {
  const pagina = record(data);
  const id = tekst(pagina.id);
  if (!id) return null;
  return {
    id,
    naam: tekst(pagina.name) ?? "",
    parentId: tekst(record(pagina.parent).id),
    link: tekst(pagina.browserLink),
  };
}

async function request(pad: string, init?: RequestInit): Promise<Response> {
  const token = process.env.SUPERHUMAN_DOCS_TOKEN;
  if (!token) throw new Error("SUPERHUMAN_DOCS_TOKEN ontbreekt in .env.local.");
  const response = await fetch(`${API}${pad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Superhuman weigert het token. Het is ingetrokken, of heeft geen toegang tot dit doc.",
    );
  }
  return response;
}

async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    throw new Error(`Superhuman gaf een fout (${response.status}).`);
  }
  return record(await response.json());
}

/** Alle pagina's van een doc, met hun ouder. */
export async function leesPaginas(docId: string): Promise<Pagina[]> {
  const paginas: Pagina[] = [];
  let pageToken: string | null = null;
  do {
    // Superhuman weigert limit naast pageToken (400).
    const params = new URLSearchParams(
      pageToken ? { pageToken } : { limit: "500" },
    );
    const data = await json(
      await request(`/docs/${encodeURIComponent(docId)}/pages?${params}`),
    );
    if (Array.isArray(data.items)) {
      paginas.push(...data.items.flatMap((item) => parsePagina(item) ?? []));
    }
    pageToken = tekst(data.nextPageToken);
  } while (pageToken);
  return paginas;
}

/** Eén pagina; null zolang hij nog niet bestaat (de API loopt 20 tot 30 seconden achter). */
export async function leesPagina(
  docId: string,
  id: string,
): Promise<Pagina | null> {
  const response = await request(
    `/docs/${encodeURIComponent(docId)}/pages/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) return null;
  return parsePagina(await json(response));
}

/**
 * De inhoud van een pagina als Markdown. De API maakt daar op de achtergrond een
 * export van; dit vraagt hem aan en wacht tot hij klaar is.
 */
export async function leesInhoud(docId: string, id: string): Promise<string> {
  const pad = `/docs/${encodeURIComponent(docId)}/pages/${encodeURIComponent(id)}/export`;
  const gestart = await json(
    await request(pad, {
      method: "POST",
      body: JSON.stringify({ outputFormat: "markdown" }),
    }),
  );
  const exportId = tekst(gestart.id);
  if (!exportId) throw new Error("Superhuman gaf geen export terug.");
  for (let poging = 0; poging < 10; poging++) {
    const stand = await json(
      await request(`${pad}/${encodeURIComponent(exportId)}`),
    );
    const link = tekst(stand.downloadLink);
    if (stand.status === "complete" && link) {
      const response = await fetch(link, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(`Superhuman gaf een fout (${response.status}).`);
      return response.text();
    }
    if (stand.status === "failed")
      throw new Error("Superhuman kon de pagina niet exporteren.");
    await new Promise((klaar) => setTimeout(klaar, 1000));
  }
  throw new Error("De export uit Superhuman duurde te lang.");
}

/** Maakt een subpagina, met Markdown-inhoud als die er is, en geeft het id terug. */
export async function maakPagina(
  docId: string,
  parentPageId: string,
  naam: string,
  markdown: string,
): Promise<string> {
  const data = await json(
    await request(`/docs/${encodeURIComponent(docId)}/pages`, {
      method: "POST",
      body: JSON.stringify({
        name: naam,
        parentPageId,
        ...(markdown && {
          pageContent: {
            type: "canvas",
            canvasContent: { format: "markdown", content: markdown },
          },
        }),
      }),
    }),
  );
  const id = tekst(data.id);
  if (!id) throw new Error("Superhuman gaf geen pagina-id terug.");
  return id;
}
