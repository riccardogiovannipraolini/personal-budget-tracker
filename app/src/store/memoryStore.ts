import { seedCategories, seedMapping } from '../seedData.js';
import type {
  Category,
  RawTransaction,
  SyncState,
  Transaction,
} from '../types.js';
import type { ListTransactionsOptions, Store } from './store.js';

/** Store in-memory: nessuna dipendenza esterna. Per demo, test e sviluppo offline. */
export class MemoryStore implements Store {
  private categories: Category[] = [];
  private mapping = new Map<string, number>(); // rawCategory -> categoryId
  private transactions: Transaction[] = [];
  private nextId = 1;
  private sync: SyncState = { lastSync: null, lastExternalId: null };

  async init(): Promise<void> {
    if (this.categories.length > 0) return;
    let id = 1;
    for (const c of seedCategories) {
      this.categories.push({ id, name: c.name, monthlyThreshold: c.monthlyThreshold, icon: c.icon });
      id++;
    }
    for (const [raw, catName] of Object.entries(seedMapping)) {
      const cat = this.categories.find((c) => c.name === catName);
      if (cat) this.mapping.set(raw, cat.id);
    }
  }

  async listCategories(): Promise<Category[]> {
    return [...this.categories];
  }

  async createCategory(name: string, monthlyThreshold: number, icon = 'tag'): Promise<Category> {
    if (this.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Esiste già una categoria "${name}"`);
    }
    const id = Math.max(0, ...this.categories.map((c) => c.id)) + 1;
    const cat: Category = { id, name, monthlyThreshold, icon };
    this.categories.push(cat);
    return cat;
  }

  async updateCategory(
    id: number,
    fields: { name?: string; monthlyThreshold?: number; icon?: string },
  ): Promise<void> {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return;
    if (fields.name != null) {
      if (this.categories.some((c) => c.id !== id && c.name.toLowerCase() === fields.name!.toLowerCase())) {
        throw new Error(`Esiste già una categoria "${fields.name}"`);
      }
      cat.name = fields.name;
    }
    if (fields.monthlyThreshold != null) cat.monthlyThreshold = fields.monthlyThreshold;
    if (fields.icon != null) cat.icon = fields.icon;
  }

  async deleteCategory(id: number): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    for (const t of this.transactions) if (t.categoryId === id) t.categoryId = null;
    for (const [k, v] of this.merchantRules) if (v === id) this.merchantRules.delete(k);
    for (const [k, v] of this.mapping) if (v === id) this.mapping.delete(k);
  }

  async getCategoryIdForRaw(rawCategory: string | undefined): Promise<number | null> {
    if (!rawCategory) return null;
    return this.mapping.get(rawCategory) ?? null;
  }

  private merchantRules = new Map<string, number>(); // merchantKey -> categoryId

  async getCategoryByMerchant(merchantKey: string): Promise<number | null> {
    return this.merchantRules.get(merchantKey) ?? null;
  }

  async learnMerchantRule(merchantKey: string, categoryId: number): Promise<void> {
    this.merchantRules.set(merchantKey, categoryId);
  }

  async setTransactionCategory(id: number, categoryId: number | null): Promise<void> {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) tx.categoryId = categoryId;
  }

  async setTransactionExcluded(id: number, excluded: boolean): Promise<void> {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) tx.excluded = excluded;
  }

  async deleteTransaction(id: number): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
  }

  async transactionExists(externalId: string): Promise<boolean> {
    return this.transactions.some((t) => t.externalId === externalId);
  }

  async insertTransaction(
    tx: RawTransaction,
    categoryId: number | null,
  ): Promise<Transaction> {
    const saved: Transaction = { ...tx, id: this.nextId++, categoryId, excluded: false };
    this.transactions.push(saved);
    return saved;
  }

  async listTransactions(opts: ListTransactionsOptions = {}): Promise<Transaction[]> {
    let rows = [...this.transactions];
    if (opts.period) rows = rows.filter((t) => t.bookedAt.startsWith(opts.period!));
    if (opts.categoryId != null) rows = rows.filter((t) => t.categoryId === opts.categoryId);
    rows.sort((a, b) => (a.bookedAt < b.bookedAt ? 1 : -1)); // più recenti prima
    if (opts.limit != null) rows = rows.slice(0, opts.limit);
    return rows;
  }

  async updateTransactionCategory(
    id: number,
    rawCategory: string | undefined,
    categoryId: number | null,
  ): Promise<void> {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) {
      tx.rawCategory = rawCategory;
      tx.categoryId = categoryId;
    }
  }

  async spentByCategoryForPeriod(period: string): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    for (const t of this.transactions) {
      if (!t.bookedAt.startsWith(period)) continue;
      if (t.categoryId == null) continue;
      if (t.excluded) continue; // esclusa dai conteggi
      if (t.amount >= 0) continue; // solo uscite
      result.set(t.categoryId, (result.get(t.categoryId) ?? 0) + Math.abs(t.amount));
    }
    return result;
  }

  async uncategorizedSpentForPeriod(period: string): Promise<number> {
    let total = 0;
    for (const t of this.transactions) {
      if (!t.bookedAt.startsWith(period)) continue;
      if (t.categoryId != null) continue;
      if (t.excluded) continue; // esclusa dai conteggi
      if (t.amount >= 0) continue;
      total += Math.abs(t.amount);
    }
    return total;
  }

  async upsertBudgetPeriod(): Promise<void> {
    // Il MemoryStore ricalcola al volo da spentByCategoryForPeriod, niente da materializzare.
  }

  async getSyncState(): Promise<SyncState> {
    return { ...this.sync };
  }

  async setSyncState(state: SyncState): Promise<void> {
    // Merge: non azzerare rateLimitedUntil se non fornito.
    this.sync = { ...this.sync, ...state };
  }

  async setRateLimitedUntil(iso: string | null): Promise<void> {
    this.sync.rateLimitedUntil = iso;
  }

  async close(): Promise<void> {}
}
