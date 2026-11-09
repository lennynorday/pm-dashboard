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
    const params = new URLSearchParams({ limit: "500" });
    if (pageToken) params.set("pageToken", pageToken);
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
