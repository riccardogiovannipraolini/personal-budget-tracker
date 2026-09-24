import { currentPeriod } from '../config.js';
import { config } from '../config.js';
import { buildDashboard } from '../aggregate.js';
import type { Store } from '../store/index.js';
import type { Transaction } from '../types.js';
import { ensureCategoriesDb, indexByKey, notionRequest, rt, title } from './notionClient.js';

export interface NotionSyncResult {
  period: string;
  transactions: number;
  categories: number;
  dryRun: boolean;
}

export interface SyncOptions {
  /** Non scrive su Notion: stampa le prime righe che verrebbero create/aggiornate. */
  dryRun?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Primo giorno del mese successivo a 'YYYY-MM' (per il filtro range su Data). */
function nextMonthStart(period: string): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

/** Abbonamento riconosciuto: euristica sul nome categoria (l'app non ha un flag dedicato). */
function isRecurring(categoryName: string | undefined): boolean {
  return !!categoryName && /abbonament|software/i.test(categoryName);
}

// ─── Regola di conflitto per-campo (Spese — tracker) ────────────────────────
// Campi di CONTABILITÀ (app autorevole): Voce, Importo, Data → la push li scrive
//   sempre (l'app importa e aggiorna i movimenti).
// Campi di CORREZIONE MANUALE (Notion autorevole): Categoria, Metodo, Ricorrente
//   → scritti solo alla CREAZIONE (valore iniziale), MAI sovrascritti dopo, così
//   una correzione fatta in Notion resta. Il flusso Notion→app li riporta (pull).
// Note = identità (external_id): scritto solo alla creazione, mai cambiato.

/** Campi app (contabilità): sempre sincronizzati verso Notion. */
function speseAppProps(tx: Transaction) {
  return {
    Voce: title(tx.merchant || tx.description || 'Transazione'),
    'Importo (€)': { number: Math.abs(tx.amount) },
    Data: { date: { start: tx.bookedAt } },
  };
}

/** Proprietà complete per la CREAZIONE (include i valori iniziali dei campi Notion). */
function speseCreateProps(tx: Transaction, categoryName: string | undefined, recurring: boolean) {
  const props: Record<string, unknown> = {
    ...speseAppProps(tx),
    Metodo: { select: { name: recurring ? 'Abbonamento' : 'Carta' } },
    Ricorrente: { checkbox: recurring },
    Note: rt(tx.externalId), // identità stabile + dedupe
  };
  if (categoryName) props.Categoria = { select: { name: categoryName } };
  return props;
}

/**
 * Sincronizza le uscite del periodo nel database "Spese — tracker".
 * Upsert per transaction id (campo Note). Salta entrate ed escluse.
 */
async function syncTransactions(
  databaseId: string,
  txns: Transaction[],
  categoryName: Map<number, string>,
  period: string,
  dryRun: boolean,
): Promise<number> {
  const expenses = txns.filter((t) => t.amount < 0 && !t.excluded);

  const dateFilter = {
    and: [
      { property: 'Data', date: { on_or_after: `${period}-01` } },
      { property: 'Data', date: { before: nextMonthStart(period) } },
    ],
  };
  const existing = dryRun ? new Map<string, string>() : await indexByKey(databaseId, dateFilter, 'Note');

  let count = 0;
  for (const tx of expenses) {
    const name = tx.categoryId != null ? categoryName.get(tx.categoryId) : undefined;

    if (dryRun) {
      if (count < 5) {
        console.log(
          `  [dry-run] ${tx.bookedAt}  ${(tx.merchant || tx.description || '').slice(0, 28).padEnd(28)} ` +
            `${Math.abs(tx.amount).toFixed(2).padStart(8)} €  ${name ?? '(senza categoria)'}` +
            `${isRecurring(name) ? '  [Abbonamento]' : ''}`,
        );
      }
      count++;
      continue;
    }

    const pageId = existing.get(tx.externalId);
    if (pageId) {
      // UPDATE: solo campi di contabilità; i campi Notion (Categoria/Metodo/
      // Ricorrente/Note) restano quelli eventualmente corretti a mano.
      await notionRequest('/pages/' + pageId, 'PATCH', { properties: speseAppProps(tx) });
    } else {
      await notionRequest('/pages', 'POST', {
        parent: { database_id: databaseId },
        properties: speseCreateProps(tx, name, isRecurring(name)),
      });
    }
    await sleep(120); // rispetta il rate limit Notion (~3 req/s)
    count++;
  }

  if (dryRun && expenses.length > 5) console.log(`  [dry-run] … e altre ${expenses.length - 5} righe.`);
  return count;
}

/**
 * Rispecchia le categorie **vive** dell'app (nome + budget mensile) e lo speso
 * del periodo nella tabella "Categorie & Budget". Dinamico: legge da
 * buildDashboard, quindi qualunque categoria l'utente crei/rinomini nell'app
 * si riflette qui. Upsert per `periodo·categoryId`.
 */
async function syncCategories(store: Store, period: string, dryRun: boolean): Promise<number> {
  const dashboard = await buildDashboard(store, period);

  if (dryRun) {
    for (const c of dashboard.categories) {
      console.log(
        `  [dry-run] ${c.categoryName.padEnd(34)} budget ${c.threshold.toFixed(0).padStart(5)} €  ` +
          `speso ${c.spent.toFixed(2).padStart(8)} €  ${c.status}`,
      );
    }
    return dashboard.categories.length;
  }

  const databaseId = await ensureCategoriesDb();
  const existing = await indexByKey(
    databaseId,
    { property: 'Periodo', rich_text: { equals: period } },
    'Key',
  );

  for (const c of dashboard.categories) {
    const key = `${period}·${c.categoryId}`;
    // App autorevole (calcolati): speso, residuo, stato → sempre aggiornati.
    const appProps = {
      'Speso (€)': { number: c.spent },
      'Residuo (€)': { number: c.remaining },
      Stato: { select: { name: c.status } },
    };
    const pageId = existing.get(key);
    if (pageId) {
      // Budget mensile è Notion-owned (correzione manuale): non lo sovrascrivo.
      await notionRequest('/pages/' + pageId, 'PATCH', { properties: appProps });
    } else {
      await notionRequest('/pages', 'POST', {
        parent: { database_id: databaseId },
        properties: {
          ...appProps,
          Categoria: title(c.categoryName),
          Periodo: rt(period),
          'Budget mensile (€)': { number: c.threshold }, // valore iniziale
          Key: rt(key),
        },
      });
    }
    await sleep(120);
  }

  return dashboard.categories.length;
}

/**
 * Riversa in Notion, per il periodo indicato (default mese corrente):
 * - le uscite → database esistente "Spese — tracker" (NOTION_DB_SPESE);
 * - le categorie + budget vivi dell'app → tabella "Categorie & Budget".
 * Idempotente (upsert). Con { dryRun: true } mostra solo l'anteprima.
 */
export async function syncToNotion(
  store: Store,
  period = currentPeriod(),
  opts: SyncOptions = {},
): Promise<NotionSyncResult> {
  const dryRun = !!opts.dryRun;

  const cats = await store.listCategories();
  const categoryName = new Map(cats.map((c) => [c.id, c.name]));
  const txns = await store.listTransactions({ period, limit: 10000 });

  let transactions = 0;
  if (config.notion.speseDbId) {
    if (dryRun) console.log('▸ Transazioni → "Spese — tracker" (anteprima):');
    transactions = await syncTransactions(config.notion.speseDbId, txns, categoryName, period, dryRun);
  } else {
    console.log('⚠ NOTION_DB_SPESE non impostato: salto le transazioni (sincronizzo solo le categorie).');
  }

  if (dryRun) console.log('▸ Categorie & budget (anteprima):');
  const categories = await syncCategories(store, period, dryRun);

  return { period, transactions, categories, dryRun };
}

/**
 * Ciclo bidirezionale: prima assorbe nell'app le modifiche fatte in Notion
 * (pull), poi ripropaga lo stato dell'app su Notion (push). L'ordine pull→push
 * mantiene i due lati coerenti dopo una modifica umana in Notion.
 */
export async function syncTwoWay(store: Store, period = currentPeriod()): Promise<NotionSyncResult> {
  const { pullFromNotion } = await import('./notionPull.js');
  const pull = await pullFromNotion(store);
  console.log(
    `↩ Pull da Notion: ${pull.recategorized} ricategorizzate, ${pull.inserted} inserite, ` +
      `${pull.renamed} rinominate, ${pull.categoriesCreated} categorie create, ` +
      `${pull.budgetsUpdated} budget aggiornati, ${pull.skipped} saltate.`,
  );
  return syncToNotion(store, period);
}
