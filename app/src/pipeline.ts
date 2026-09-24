import { config, currentPeriod } from './config.js';
import { buildDashboard } from './aggregate.js';
import { ingest, type IngestResult } from './ingest.js';
import { notifyForCategories } from './notify.js';
import type { TransactionSource } from './sources/index.js';
import type { Store } from './store/index.js';
import type { DashboardData } from './types.js';

export interface PipelineResult {
  ingest: IngestResult;
  dashboard: DashboardData;
  notifications: string[];
}

/**
 * Esegue un ciclo completo: import → categorizzazione → aggregazione/soglie → notifiche.
 * È il corpo di un singolo "tick" dello scheduler (§1.3 happy path).
 */
export async function runPipeline(
  store: Store,
  source: TransactionSource,
): Promise<PipelineResult> {
  const ingestResult = await ingest(source, store);
  const period = currentPeriod();
  const dashboard = await buildDashboard(store, period);

  // Notifica solo le categorie toccate da nuove transazioni del periodo corrente,
  // per evitare alert ripetuti a ogni polling.
  const touched = new Set<number>();
  for (const tx of ingestResult.insertedTransactions) {
    if (tx.categoryId != null && tx.bookedAt.startsWith(period)) {
      touched.add(tx.categoryId);
    }
  }
  const notifications = await notifyForCategories(dashboard, touched);

  // Sink opzionale: riversa il periodo corrente su Notion. Non deve mai far
  // fallire il ciclo, quindi eventuali errori sono solo loggati.
  if (config.notion.enabled) {
    try {
      const { syncToNotion, syncTwoWay } = await import('./notion/notionSync.js');
      const r = config.notion.twoWay
        ? await syncTwoWay(store, period)
        : await syncToNotion(store, period);
      console.log(`Notion: ${r.transactions} transazioni, ${r.categories} categorie.`);
    } catch (err) {
      console.error('Sync Notion fallita (il resto della pipeline è ok):', (err as Error).message);
    }
  }

  return { ingest: ingestResult, dashboard, notifications };
}
