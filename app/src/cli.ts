import { config } from './config.js';
import { runPipeline } from './pipeline.js';
import { createSource } from './sources/index.js';
import { MockSource } from './sources/mockSource.js';
import { createStore, type Store } from './store/index.js';
import { MemoryStore } from './store/memoryStore.js';
import type { DashboardData } from './types.js';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

function bar(ratio: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function printDashboard(d: DashboardData): void {
  console.log(`\n📊 Dashboard — periodo ${d.period}`);
  console.log(
    `   Totale speso: ${eur(d.totalSpent)} / ${eur(d.totalThreshold)}  ` +
      `(residuo ${eur(d.totalRemaining)})\n`,
  );
  const icon = { exceeded: '🔴', near: '🟠', ok: '🟢' } as const;
  for (const c of d.categories) {
    const name = c.categoryName.padEnd(20);
    console.log(
      `   ${icon[c.status]} ${name} ${bar(c.ratio)} ` +
        `${eur(c.spent)} / ${eur(c.threshold)}`,
    );
  }
  console.log('');
}

async function runOnce(store: Store): Promise<void> {
  await store.init();
  const result = await runPipeline(store, createSource());
  console.log(
    `Import: ${result.ingest.fetched} lette, +${result.ingest.inserted} nuove, ` +
      `${result.ingest.duplicates} duplicate, ${result.ingest.uncategorized} senza categoria.`,
  );
  if (result.notifications.length) {
    console.log(`\n🔔 Notifiche inviate (${result.notifications.length}):`);
    for (const n of result.notifications) console.log('   - ' + n.replace(/\n/g, ' '));
  }
  printDashboard(result.dashboard);
}

async function main() {
  const cmd = process.argv[2] ?? 'run-once';

  switch (cmd) {
    case 'run-once': {
      const store = createStore();
      await runOnce(store);
      await store.close();
      break;
    }
    case 'demo': {
      // Demo autosufficiente: in-memory + dati mock, nessuna config richiesta.
      console.log('▶ Demo (store in-memory, sorgente mock)');
      const store = new MemoryStore();
      await store.init();
      const result = await runPipeline(store, new MockSource());
      console.log(
        `Import: +${result.ingest.inserted} transazioni, ` +
          `${result.notifications.length} notifiche.`,
      );
      if (result.notifications.length) {
        console.log('\n🔔 Notifiche:');
        for (const n of result.notifications) console.log('   - ' + n.replace(/\n/g, ' '));
      }
      printDashboard(result.dashboard);
      break;
    }
    case 'sync-notion': {
      const store = createStore();
      await store.init();
      const rest = process.argv.slice(3);
      const dryRun = rest.includes('--dry-run');
      const twoWay = rest.includes('--two-way');
      const period = rest.find((a) => /^\d{4}-\d{2}$/.test(a)); // opzionale: YYYY-MM
      const { syncToNotion, syncTwoWay } = await import('./notion/notionSync.js');
      const r = twoWay ? await syncTwoWay(store, period) : await syncToNotion(store, period, { dryRun });
      console.log(
        `${r.dryRun ? '✓ [dry-run] anteprima' : '✓ Notion aggiornato'} (periodo ${r.period}): ` +
          `${r.transactions} transazioni, ${r.categories} categorie.`,
      );
      await store.close();
      break;
    }
    case 'pull-notion': {
      const store = createStore();
      await store.init();
      const dryRun = process.argv.slice(3).includes('--dry-run');
      const { pullFromNotion } = await import('./notion/notionPull.js');
      const r = await pullFromNotion(store, { dryRun });
      console.log(
        `${dryRun ? '✓ [dry-run] anteprima' : '✓ Pull da Notion'}: ${r.recategorized} ricategorizzate, ` +
          `${r.inserted} inserite, ${r.renamed} rinominate, ${r.categoriesCreated} categorie create, ` +
          `${r.budgetsUpdated} budget aggiornati, ${r.skipped} saltate.`,
      );
      await store.close();
      break;
    }
    case 'recategorize': {
      const store = createStore();
      await store.init();
      const { recategorize } = await import('./recategorize.js');
      const r = await recategorize(store);
      console.log(
        `Ri-categorizzazione: ${r.total} transazioni, ${r.updated} aggiornate. ` +
          `Ora ${r.categorized} con categoria, ${r.uncategorized} senza.`,
      );
      await store.close();
      break;
    }
    case 'migrate':
    case 'seed': {
      if (config.store !== 'pg') {
        console.error(`"${cmd}" richiede STORE=pg e un DATABASE_URL valido.`);
        process.exit(1);
      }
      const store = createStore();
      await store.init(); // idempotente: applica schema e, se vuoto, il seed
      console.log(`✓ ${cmd} completato (schema + seed applicati su Postgres).`);
      await store.close();
      break;
    }
    default:
      console.error(
        `Comando sconosciuto: "${cmd}". Usa: run-once | demo | recategorize | ` +
          `sync-notion | pull-notion | migrate | seed`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
