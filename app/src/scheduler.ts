import cron from 'node-cron';
import { config } from './config.js';
import { runPipeline } from './pipeline.js';
import { createSource } from './sources/index.js';
import { createStore } from './store/index.js';

/**
 * Scheduler: esegue la pipeline a intervalli regolari (default ogni 5h).
 * Corrisponde al nodo "Scheduler: ogni 4-6h" del flusso.
 *
 * Nota: con STORE=memory i dati vivono solo finché il processo è attivo.
 * Per un cron persistente usare STORE=pg (Supabase) e tenere vivo il processo
 * (o, in produzione, pg_cron / una Edge Function schedulata).
 */
async function main() {
  const store = createStore();
  await store.init();

  const tick = async () => {
    const started = new Date();
    try {
      const r = await runPipeline(store, createSource());
      console.log(
        `[${started.toISOString()}] sync: +${r.ingest.inserted} nuove, ` +
          `${r.ingest.duplicates} duplicate, ${r.notifications.length} notifiche`,
      );
    } catch (err) {
      console.error(`[${started.toISOString()}] sync fallito:`, err);
    }
  };

  if (!cron.validate(config.pollCron)) {
    throw new Error(`POLL_CRON non valido: "${config.pollCron}"`);
  }

  console.log(`Scheduler avviato (cron: "${config.pollCron}"). Eseguo subito un primo ciclo…`);
  await tick(); // primo ciclo immediato
  cron.schedule(config.pollCron, tick);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
