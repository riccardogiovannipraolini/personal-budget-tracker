import { resolveCategoryId } from './categorize.js';
import type { Store } from './store/index.js';
import type { TransactionSource } from './sources/index.js';
import type { Transaction } from './types.js';

export interface IngestResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  uncategorized: number;
  insertedTransactions: Transaction[];
}

/**
 * Recupera dalla sorgente, deduplica per external_id, assegna la categoria
 * personale (via mapping) e salva su DB. Corrisponde ai nodi
 * "Transazione nuova?" → "Mappa categoria" → "Salva su DB" del flusso.
 */
export async function ingest(
  source: TransactionSource,
  store: Store,
): Promise<IngestResult> {
  const sync = await store.getSyncState();
  const incoming = await source.fetch(sync.lastExternalId);

  const result: IngestResult = {
    fetched: incoming.length,
    inserted: 0,
    duplicates: 0,
    uncategorized: 0,
    insertedTransactions: [],
  };

  let lastExternalId = sync.lastExternalId;

  for (const tx of incoming) {
    if (await store.transactionExists(tx.externalId)) {
      result.duplicates++;
      continue;
    }
    const categoryId = await resolveCategoryId(store, tx);
    if (categoryId == null) result.uncategorized++;

    const saved = await store.insertTransaction(tx, categoryId);
    result.inserted++;
    result.insertedTransactions.push(saved);
    lastExternalId = tx.externalId;
  }

  await store.setSyncState({
    lastSync: new Date().toISOString(),
    lastExternalId,
  });

  return result;
}
