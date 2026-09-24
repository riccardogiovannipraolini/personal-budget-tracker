import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryStore } from '../src/store/memoryStore.js';
import { MockSource } from '../src/sources/mockSource.js';
import { CsvSource } from '../src/sources/csvSource.js';
import { ingest } from '../src/ingest.js';
import { buildDashboard } from '../src/aggregate.js';
import { runPipeline } from '../src/pipeline.js';
import { normalizeMerchant, relabelTransaction } from '../src/categorize.js';
import type { RawTransaction } from '../src/types.js';
import type { TransactionSource } from '../src/sources/source.js';

class StaticSource implements TransactionSource {
  readonly name = 'static';
  constructor(private rows: RawTransaction[]) {}
  async fetch(): Promise<RawTransaction[]> {
    return this.rows;
  }
}

test('deduplica: due run sugli stessi dati non inseriscono duplicati', async () => {
  const store = new MemoryStore();
  await store.init();
  const source = new MockSource(20, 1);

  const first = await ingest(source, store);
  assert.equal(first.inserted, 20);
  assert.equal(first.duplicates, 0);

  const second = await ingest(source, store);
  assert.equal(second.inserted, 0);
  assert.equal(second.duplicates, 20);
});

test('categorizzazione: mappa raw_category -> categoria personale', async () => {
  const store = new MemoryStore();
  await store.init();
  const groceries = (await store.listCategories()).find((c) => c.name === 'Spesa / Supermercato');
  assert.ok(groceries);

  await ingest(
    new StaticSource([
      { externalId: 'a', bookedAt: '2026-05-10', amount: -10, rawCategory: 'spesa' },
      { externalId: 'b', bookedAt: '2026-05-11', amount: -5, rawCategory: 'sconosciuta' },
    ]),
    store,
  );

  const txs = await store.listTransactions();
  const a = txs.find((t) => t.externalId === 'a');
  const b = txs.find((t) => t.externalId === 'b');
  assert.equal(a?.categoryId, groceries!.id);
  assert.equal(b?.categoryId, null); // non mappata
});

test('soglie: stato exceeded/near/ok calcolato correttamente', async () => {
  const store = new MemoryStore();
  await store.init();
  const cats = await store.listCategories();
  const trasporti = cats.find((c) => c.name === 'Trasporti (pedaggi/parcheggi/mezzi)')!; // soglia 60

  await ingest(
    new StaticSource([
      { externalId: 't1', bookedAt: '2026-05-02', amount: -130, rawCategory: 'trasporti' },
    ]),
    store,
  );

  const d = await buildDashboard(store, '2026-05');
  const row = d.categories.find((c) => c.categoryId === trasporti.id)!;
  assert.equal(row.status, 'exceeded');
  assert.equal(row.spent, 130);
  assert.equal(row.remaining, -70);
});

test('le entrate (amount positivo) non contano come spesa', async () => {
  const store = new MemoryStore();
  await store.init();
  await ingest(
    new StaticSource([
      { externalId: 'in1', bookedAt: '2026-05-01', amount: 1500, rawCategory: 'spesa' },
      { externalId: 'out1', bookedAt: '2026-05-01', amount: -40, rawCategory: 'spesa' },
    ]),
    store,
  );
  const d = await buildDashboard(store, '2026-05');
  const groceries = d.categories.find((c) => c.categoryName === 'Spesa / Supermercato')!;
  assert.equal(groceries.spent, 40);
});

test('CSV source: legge e normalizza il file di esempio', async () => {
  const source = new CsvSource('./sample-data/transactions.csv');
  const rows = await source.fetch();
  assert.ok(rows.length >= 20);
  assert.ok(rows.every((r) => r.externalId && r.bookedAt && typeof r.amount === 'number'));
});

test('normalizeMerchant: varianti dello stesso esercente danno la stessa chiave', () => {
  const a = normalizeMerchant('PAGAMENTO PRESSO WWW PERPLEXITY AI +');
  const b = normalizeMerchant('PERPLEXITY AI');
  assert.equal(a, b);
  assert.equal(normalizeMerchant('PALESTRA TORINO SRL TORINO TO'), normalizeMerchant('PALESTRA TORINO'));
});

test('apprendimento: re-etichettare impara e applica a tutto lo stesso esercente', async () => {
  const store = new MemoryStore();
  await store.init();
  const target = (await store.listCategories()).find((c) => c.name === 'Altro / Vario')!;

  // Esercente fittizio NON coperto da alcuna regola → inizialmente senza categoria.
  await ingest(
    new StaticSource([
      { externalId: 'c1', bookedAt: '2026-05-02', amount: -50, merchant: 'NEGOZIO MISTERIOSO QZX' },
      { externalId: 'c2', bookedAt: '2026-05-09', amount: -30, merchant: 'NEGOZIO MISTERIOSO QZX' },
      { externalId: 'c3', bookedAt: '2026-05-15', amount: -20, merchant: 'Esselunga' },
    ]),
    store,
  );

  const txs = await store.listTransactions();
  const c1 = txs.find((t) => t.externalId === 'c1')!;
  assert.equal(c1.categoryId, null); // sconosciuto all'inizio

  const res = await relabelTransaction(store, c1.id, target.id);
  assert.equal(res.learned, true);
  assert.equal(res.updatedCount, 2); // entrambe le NEGOZIO MISTERIOSO

  // una NUOVA transazione dello stesso esercente viene categorizzata da sola
  const after = await ingest(
    new StaticSource([
      { externalId: 'c4', bookedAt: '2026-05-20', amount: -40, merchant: 'PAGAMENTO PRESSO NEGOZIO MISTERIOSO QZX TO' },
    ]),
    store,
  );
  assert.equal(after.uncategorized, 0);
  const c4 = (await store.listTransactions()).find((t) => t.externalId === 'c4')!;
  assert.equal(c4.categoryId, target.id);
});

test('runPipeline: produce dashboard coerente con i totali', async () => {
  const store = new MemoryStore();
  await store.init();
  const r = await runPipeline(store, new MockSource(40, 7));
  const sum = r.dashboard.categories.reduce((s, c) => s + c.spent, 0);
  assert.ok(Math.abs(sum - r.dashboard.totalSpent) < 0.01);
  assert.ok(r.dashboard.totalSpent > 0);
});
