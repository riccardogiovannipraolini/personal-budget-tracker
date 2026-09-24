import type {
  Category,
  RawTransaction,
  SyncState,
  Transaction,
} from '../types.js';

export interface ListTransactionsOptions {
  period?: string; // 'YYYY-MM'
  categoryId?: number;
  limit?: number;
}

/**
 * Astrazione di persistenza. La pipeline dipende solo da questa interfaccia,
 * non dal motore sottostante (Postgres/Supabase in produzione, in-memory per demo/test).
 */
export interface Store {
  /** Garantisce schema + dati iniziali (categorie/mapping). Idempotente. */
  init(): Promise<void>;

  listCategories(): Promise<Category[]>;

  createCategory(name: string, monthlyThreshold: number, icon?: string): Promise<Category>;
  updateCategory(
    id: number,
    fields: { name?: string; monthlyThreshold?: number; icon?: string },
  ): Promise<void>;
  /** Elimina la categoria: le sue transazioni tornano senza categoria, regole/soglie rimosse. */
  deleteCategory(id: number): Promise<void>;

  /** Risolve la categoria personale da una categoria grezza (Tink). null se non mappata. */
  getCategoryIdForRaw(rawCategory: string | undefined): Promise<number | null>;

  /** Categoria imparata per un esercente normalizzato (merchant_rule). null se assente. */
  getCategoryByMerchant(merchantKey: string): Promise<number | null>;

  /** Salva/aggiorna una regola imparata esercente→categoria (source 'manual'). */
  learnMerchantRule(merchantKey: string, categoryId: number): Promise<void>;

  /** Imposta solo la categoria di una transazione (senza toccare raw_category). */
  setTransactionCategory(id: number, categoryId: number | null): Promise<void>;

  /** Esclude/reinclude una transazione dai conteggi (resta nel DB). */
  setTransactionExcluded(id: number, excluded: boolean): Promise<void>;

  /** Elimina definitivamente una transazione dal DB. */
  deleteTransaction(id: number): Promise<void>;

  /** Deduplica: true se l'external_id è già presente. */
  transactionExists(externalId: string): Promise<boolean>;

  insertTransaction(
    tx: RawTransaction,
    categoryId: number | null,
  ): Promise<Transaction>;

  listTransactions(opts?: ListTransactionsOptions): Promise<Transaction[]>;

  /** Aggiorna categoria (e raw_category) di una transazione: usato dalla ri-categorizzazione. */
  updateTransactionCategory(
    id: number,
    rawCategory: string | undefined,
    categoryId: number | null,
  ): Promise<void>;

  /** Somma delle uscite (amount < 0, in valore assoluto) per categoria nel periodo. */
  spentByCategoryForPeriod(period: string): Promise<Map<number, number>>;

  /** Somma delle uscite del periodo non attribuite ad alcuna categoria. */
  uncategorizedSpentForPeriod(period: string): Promise<number>;

  upsertBudgetPeriod(
    categoryId: number,
    period: string,
    spent: number,
    threshold: number,
  ): Promise<void>;

  getSyncState(): Promise<SyncState>;
  setSyncState(state: SyncState): Promise<void>;

  /** Imposta (o azzera con null) la pausa stimata per rate limit. */
  setRateLimitedUntil(iso: string | null): Promise<void>;

  /** Chiude le connessioni (no-op per memory). */
  close(): Promise<void>;
}
