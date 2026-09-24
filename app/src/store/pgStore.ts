import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { config } from '../config.js';
import type {
  Category,
  RawTransaction,
  SyncState,
  Transaction,
} from '../types.js';
import type { ListTransactionsOptions, Store } from './store.js';

const { Pool } = pg;
// Restituisci le colonne DATE (oid 1082) come stringa 'YYYY-MM-DD' grezza, senza
// conversione a Date/UTC: evita lo slittamento di un giorno per il fuso orario.
pg.types.setTypeParser(1082, (v: string) => v);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Store su Postgres/Supabase. */
export class PgStore implements Store {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    if (!connectionString) {
      throw new Error('DATABASE_URL mancante: richiesto con STORE=pg.');
    }
    this.pool = new Pool({
      connectionString,
      ssl: buildSslConfig(connectionString),
    });
  }

  /** Applica schema + seed (idempotenti). Eseguibile a ogni avvio senza danni. */
  async init(): Promise<void> {
    const schema = await readFile(resolve(projectRoot, 'db/schema.sql'), 'utf8');
    await this.pool.query(schema);
    const countRes = await this.pool.query<{ count: string }>('select count(*) from category');
    if (Number(countRes.rows[0]?.count ?? '0') === 0) {
      const seed = await readFile(resolve(projectRoot, 'db/seed.sql'), 'utf8');
      await this.pool.query(seed);
    }
  }

  async listCategories(): Promise<Category[]> {
    const res = await this.pool.query(
      'select id, name, monthly_threshold, icon from category order by name',
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      monthlyThreshold: Number(r.monthly_threshold),
      icon: r.icon,
    }));
  }

  async createCategory(name: string, monthlyThreshold: number, icon = 'tag'): Promise<Category> {
    try {
      const res = await this.pool.query(
        'insert into category (name, monthly_threshold, icon) values ($1, $2, $3) returning id, name, monthly_threshold, icon',
        [name, monthlyThreshold, icon],
      );
      const r = res.rows[0];
      return { id: Number(r.id), name: r.name, monthlyThreshold: Number(r.monthly_threshold), icon: r.icon };
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new Error(`Esiste già una categoria "${name}"`);
      throw err;
    }
  }

  async updateCategory(
    id: number,
    fields: { name?: string; monthlyThreshold?: number; icon?: string },
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (fields.name != null) {
      params.push(fields.name);
      sets.push(`name = $${params.length}`);
    }
    if (fields.monthlyThreshold != null) {
      params.push(fields.monthlyThreshold);
      sets.push(`monthly_threshold = $${params.length}`);
    }
    if (fields.icon != null) {
      params.push(fields.icon);
      sets.push(`icon = $${params.length}`);
    }
    if (!sets.length) return;
    params.push(id);
    try {
      await this.pool.query(`update category set ${sets.join(', ')} where id = $${params.length}`, params);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new Error(`Esiste già una categoria "${fields.name}"`);
      throw err;
    }
  }

  async deleteCategory(id: number): Promise<void> {
    // FK: transaction.category_id ON DELETE SET NULL; merchant_rule/budget_period/category_mapping CASCADE.
    await this.pool.query('delete from category where id = $1', [id]);
  }

  async getCategoryIdForRaw(rawCategory: string | undefined): Promise<number | null> {
    if (!rawCategory) return null;
    const res = await this.pool.query(
      'select category_id from category_mapping where raw_category = $1',
      [rawCategory],
    );
    return res.rows[0] ? Number(res.rows[0].category_id) : null;
  }

  async getCategoryByMerchant(merchantKey: string): Promise<number | null> {
    const res = await this.pool.query(
      'select category_id from merchant_rule where merchant_key = $1',
      [merchantKey],
    );
    return res.rows[0] ? Number(res.rows[0].category_id) : null;
  }

  async learnMerchantRule(merchantKey: string, categoryId: number): Promise<void> {
    await this.pool.query(
      `insert into merchant_rule (merchant_key, category_id, source, updated_at)
       values ($1, $2, 'manual', now())
       on conflict (merchant_key)
       do update set category_id = excluded.category_id, source = 'manual', updated_at = now()`,
      [merchantKey, categoryId],
    );
  }

  async setTransactionCategory(id: number, categoryId: number | null): Promise<void> {
    await this.pool.query('update transaction set category_id = $2 where id = $1', [
      id,
      categoryId,
    ]);
  }

  async setTransactionExcluded(id: number, excluded: boolean): Promise<void> {
    await this.pool.query('update transaction set excluded = $2 where id = $1', [id, excluded]);
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.pool.query('delete from transaction where id = $1', [id]);
  }

  async transactionExists(externalId: string): Promise<boolean> {
    const res = await this.pool.query(
      'select 1 from transaction where external_id = $1 limit 1',
      [externalId],
    );
    return res.rowCount! > 0;
  }

  async insertTransaction(
    tx: RawTransaction,
    categoryId: number | null,
  ): Promise<Transaction> {
    const res = await this.pool.query(
      `insert into transaction
         (external_id, booked_at, amount, merchant, description, raw_category, category_id)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        tx.externalId,
        tx.bookedAt,
        tx.amount,
        tx.merchant ?? null,
        tx.description ?? null,
        tx.rawCategory ?? null,
        categoryId,
      ],
    );
    return { ...tx, id: Number(res.rows[0].id), categoryId, excluded: false };
  }

  async listTransactions(opts: ListTransactionsOptions = {}): Promise<Transaction[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.period) {
      params.push(`${opts.period}-01`);
      where.push(`booked_at >= $${params.length}::date`);
      params.push(`${opts.period}-01`);
      where.push(`booked_at < ($${params.length}::date + interval '1 month')`);
    }
    if (opts.categoryId != null) {
      params.push(opts.categoryId);
      where.push(`category_id = $${params.length}`);
    }
    let sql = `select id, external_id, booked_at, amount, merchant, description, raw_category, category_id, excluded
               from transaction`;
    if (where.length) sql += ` where ${where.join(' and ')}`;
    sql += ' order by booked_at desc, id desc';
    if (opts.limit != null) {
      params.push(opts.limit);
      sql += ` limit $${params.length}`;
    }
    const res = await this.pool.query(sql, params);
    return res.rows.map((r) => ({
      id: Number(r.id),
      externalId: r.external_id,
      bookedAt: typeof r.booked_at === 'string' ? r.booked_at : toIsoDate(r.booked_at),
      amount: Number(r.amount),
      merchant: r.merchant ?? undefined,
      description: r.description ?? undefined,
      rawCategory: r.raw_category ?? undefined,
      categoryId: r.category_id != null ? Number(r.category_id) : null,
      excluded: r.excluded === true,
    }));
  }

  async updateTransactionCategory(
    id: number,
    rawCategory: string | undefined,
    categoryId: number | null,
  ): Promise<void> {
    await this.pool.query(
      'update transaction set raw_category = $2, category_id = $3 where id = $1',
      [id, rawCategory ?? null, categoryId],
    );
  }

  async spentByCategoryForPeriod(period: string): Promise<Map<number, number>> {
    const res = await this.pool.query(
      `select category_id, sum(abs(amount)) as spent
       from transaction
       where category_id is not null
         and amount < 0
         and excluded = false
         and booked_at >= $1::date
         and booked_at < ($1::date + interval '1 month')
       group by category_id`,
      [`${period}-01`],
    );
    const map = new Map<number, number>();
    for (const r of res.rows) map.set(Number(r.category_id), Number(r.spent));
    return map;
  }

  async uncategorizedSpentForPeriod(period: string): Promise<number> {
    const res = await this.pool.query(
      `select coalesce(sum(abs(amount)), 0) as spent
       from transaction
       where category_id is null
         and amount < 0
         and excluded = false
         and booked_at >= $1::date
         and booked_at < ($1::date + interval '1 month')`,
      [`${period}-01`],
    );
    return Number(res.rows[0]?.spent ?? 0);
  }

  async upsertBudgetPeriod(
    categoryId: number,
    period: string,
    spent: number,
    threshold: number,
  ): Promise<void> {
    await this.pool.query(
      `insert into budget_period (category_id, period, spent, threshold)
       values ($1, $2, $3, $4)
       on conflict (category_id, period)
       do update set spent = excluded.spent, threshold = excluded.threshold`,
      [categoryId, period, spent, threshold],
    );
  }

  async getSyncState(): Promise<SyncState> {
    const res = await this.pool.query(
      'select last_sync, last_external_id, rate_limited_until from sync_state where id = 1',
    );
    const row = res.rows[0];
    return {
      lastSync: row?.last_sync ? new Date(row.last_sync).toISOString() : null,
      lastExternalId: row?.last_external_id ?? null,
      rateLimitedUntil: row?.rate_limited_until ? new Date(row.rate_limited_until).toISOString() : null,
    };
  }

  async setRateLimitedUntil(iso: string | null): Promise<void> {
    await this.pool.query('update sync_state set rate_limited_until = $1 where id = 1', [iso]);
  }

  async setSyncState(state: SyncState): Promise<void> {
    await this.pool.query(
      `update sync_state set last_sync = $1, last_external_id = $2 where id = 1`,
      [state.lastSync, state.lastExternalId],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Configura TLS per la connessione al DB.
 * - locale (localhost/127.0.0.1): niente SSL.
 * - altrimenti (es. Supabase): SSL con verifica del certificato attiva (default sicuro).
 *   Se serve il CA di Supabase, impostare DATABASE_CA_CERT al path del file .crt scaricato
 *   da Project Settings → Database → SSL configuration.
 * - DATABASE_SSL=no-verify disattiva la verifica (SOLO per debug, MITM possibile): logga un avviso.
 */
function buildSslConfig(
  connectionString: string,
): false | { rejectUnauthorized: boolean; ca?: string } {
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return false;
  }
  if (config.databaseSsl === 'no-verify') {
    console.warn(
      '[pgStore] ⚠ DATABASE_SSL=no-verify: certificato del DB NON verificato (rischio MITM). ' +
        'Usare solo in debug.',
    );
    return { rejectUnauthorized: false };
  }
  const ssl: { rejectUnauthorized: boolean; ca?: string } = { rejectUnauthorized: true };
  if (config.databaseCaCert) {
    ssl.ca = readFileSync(resolve(projectRoot, config.databaseCaCert), 'utf8');
  }
  return ssl;
}
