import { guessRawCategory } from './sources/merchantCategories.js';
import { resolveCategoryId } from './categorize.js';
import type { Store } from './store/index.js';

export interface RecategorizeResult {
  total: number;
  updated: number;
  categorized: number;
  uncategorized: number;
}

/**
 * Riapplica le regole esercente→categoria a tutte le transazioni già salvate.
 * Utile dopo aver affinato merchantCategories.ts, senza ri-scaricare dalla banca.
 */
export async function recategorize(store: Store): Promise<RecategorizeResult> {
  const txs = await store.listTransactions({ limit: 100000 });
  const result: RecategorizeResult = {
    total: txs.length,
    updated: 0,
    categorized: 0,
    uncategorized: 0,
  };

  for (const tx of txs) {
    // raw_category (per trasparenza) dalle regole generiche; la categoria finale
    // rispetta la priorità: regola imparata > regex.
    const raw = guessRawCategory(`${tx.merchant ?? ''} ${tx.description ?? ''}`);
    const categoryId = await resolveCategoryId(store, tx);

    if (raw !== tx.rawCategory || categoryId !== tx.categoryId) {
      await store.updateTransactionCategory(tx.id, raw, categoryId);
      result.updated++;
    }
    if (categoryId != null) result.categorized++;
    else result.uncategorized++;
  }
  return result;
}
