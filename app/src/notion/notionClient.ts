import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { config } from '../config.js';

const NOTION_VERSION = '2022-06-28';
const BASE_URL = 'https://api.notion.com/v1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chiamata REST all'API Notion con gestione del rate limit (429): rispetta
 * l'header Retry-After e riprova. Lancia un errore parlante sugli altri codici.
 */
export async function notionRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown,
): Promise<T> {
  if (!config.notion.token) {
    throw new Error('NOTION_TOKEN mancante: imposta il token dell’integrazione Notion in .env');
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.notion.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '1');
      await sleep((retryAfter || 1) * 1000);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion ${method} ${path} → ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  }

  throw new Error(`Notion ${method} ${path}: rate limit persistente dopo più tentativi`);
}

/** rich_text helper (Notion tronca a 2000 caratteri per rich_text). */
export const rt = (content: string) => ({
  rich_text: [{ type: 'text', text: { content: content.slice(0, 2000) } }],
});

/** title helper. */
export const title = (content: string) => ({
  title: [{ type: 'text', text: { content: content.slice(0, 2000) } }],
});

/**
 * Schema della tabella "Categorie & Budget": rispecchia dinamicamente le
 * categorie dell'app (nome + budget mensile) e lo speso del periodo. È l'app
 * la fonte di verità: qui Notion la specchia, non viceversa.
 */
function categoriesSchema(parentPageId: string) {
  return {
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Budget · Categorie (app)' } }],
    properties: {
      Categoria: { title: {} },
      Periodo: { rich_text: {} },
      'Budget mensile (€)': { number: { format: 'euro' } },
      'Speso (€)': { number: { format: 'euro' } },
      'Residuo (€)': { number: { format: 'euro' } },
      Stato: {
        select: {
          options: [
            { name: 'ok', color: 'green' },
            { name: 'near', color: 'orange' },
            { name: 'exceeded', color: 'red' },
          ],
        },
      },
      Key: { rich_text: {} },
    },
  };
}

async function loadState(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(config.notion.statePath, 'utf8'));
  } catch {
    return {};
  }
}

async function saveState(state: Record<string, string>): Promise<void> {
  await mkdir(dirname(config.notion.statePath), { recursive: true });
  const prev = await loadState();
  await writeFile(config.notion.statePath, JSON.stringify({ ...prev, ...state }, null, 2));
}

/** Legge un valore dallo stato locale (.secrets/notion.json). */
export async function getStateValue(key: string): Promise<string | undefined> {
  return (await loadState())[key];
}

/** Scrive/aggiorna un valore nello stato locale (merge, non sovrascrive gli altri). */
export async function setStateValue(key: string, value: string): Promise<void> {
  await saveState({ [key]: value });
}

let cachedBotId: string | null = null;

/** ID dell'utente-bot dell'integrazione (per distinguere le nostre scritture dagli edit umani). */
export async function getBotId(): Promise<string> {
  if (cachedBotId) return cachedBotId;
  const me = await notionRequest<{ id: string }>('/users/me', 'GET');
  cachedBotId = me.id;
  return me.id;
}

/** Pagina Notion con i metadati che servono alla pull. */
export interface EditedPage {
  id: string;
  properties: Record<string, any>;
  last_edited_time: string;
  last_edited_by: { id: string };
}

/**
 * Restituisce le pagine di un database modificate a partire da `sinceIso`
 * (filtro su last_edited_time). Se `sinceIso` è assente, restituisce tutto.
 */
export async function queryEditedSince(databaseId: string, sinceIso?: string): Promise<EditedPage[]> {
  const pages: EditedPage[] = [];
  let cursor: string | undefined;
  const filter = sinceIso
    ? { timestamp: 'last_edited_time', last_edited_time: { on_or_after: sinceIso } }
    : undefined;

  do {
    const res = await notionRequest<{
      results: EditedPage[];
      next_cursor: string | null;
      has_more: boolean;
    }>('/databases/' + databaseId + '/query', 'POST', {
      filter,
      sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

/** Estrattori tipizzati per le proprietà Notion usate dalla pull. */
export const prop = {
  title: (p: any): string => (p?.title?.[0]?.plain_text ?? '').trim(),
  richText: (p: any): string => (p?.rich_text?.[0]?.plain_text ?? '').trim(),
  number: (p: any): number | null => (typeof p?.number === 'number' ? p.number : null),
  select: (p: any): string | null => p?.select?.name ?? null,
  date: (p: any): string | null => p?.date?.start ?? null,
};

/**
 * ID del database "Categorie & Budget": preso da config/stato, o creato sotto
 * NOTION_PARENT_PAGE la prima volta (l'ID viene poi persistito e riusato).
 */
export async function ensureCategoriesDb(): Promise<string> {
  if (config.notion.categoriesDbId) return config.notion.categoriesDbId;

  const state = await loadState();
  if (state.categoriesDbId) return state.categoriesDbId;

  if (!config.notion.parentPageId) {
    throw new Error(
      'Tabella categorie non configurata: imposta NOTION_PARENT_PAGE (l’app la crea) ' +
        'oppure NOTION_DB_CATEGORIES con l’ID di un database esistente in .env',
    );
  }

  console.log('Creo la tabella "Budget · Categorie (app)" su Notion…');
  const db = await notionRequest<{ id: string }>(
    '/databases',
    'POST',
    categoriesSchema(config.notion.parentPageId),
  );
  await saveState({ categoriesDbId: db.id });
  console.log(`✓ Tabella categorie pronta (id salvato in ${config.notion.statePath}): ${db.id}`);
  return db.id;
}

/**
 * Indicizza le pagine di un database per il valore rich_text di `keyProp`
 * → pageId, applicando un `filter` Notion arbitrario (per limitare la scansione
 * al solo periodo). Serve all'upsert senza una query per riga.
 */
export async function indexByKey(
  databaseId: string,
  filter: unknown,
  keyProp: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const res = await notionRequest<{
      results: Array<{ id: string; properties: Record<string, any> }>;
      next_cursor: string | null;
      has_more: boolean;
    }>('/databases/' + databaseId + '/query', 'POST', {
      filter,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const key = page.properties[keyProp]?.rich_text?.[0]?.plain_text;
      if (key) map.set(key, page.id);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return map;
}
