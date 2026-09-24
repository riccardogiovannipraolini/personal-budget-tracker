import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express from 'express';
import { config, currentPeriod } from './config.js';
import { buildDashboard } from './aggregate.js';
import { relabelTransaction } from './categorize.js';
import { runPipeline } from './pipeline.js';
import { createSource } from './sources/index.js';
import { createStore } from './store/index.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const store = createStore();
  await store.init();

  // Sync all'avvio SOLO se l'ultima è vecchia (>4h): Hype/PSD2 limita le chiamate
  // giornaliere, e con tsx-watch il server riparte spesso. La dashboard legge
  // comunque dal DB i dati già presenti.
  try {
    const { lastSync } = await store.getSyncState();
    const ageMs = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
    if (ageMs > 4 * 60 * 60 * 1000) {
      const r = await runPipeline(store, createSource());
      console.log(`Sync iniziale: +${r.ingest.inserted} transazioni.`);
    } else {
      console.log(`Sync iniziale saltata (ultima ${Math.round(ageMs / 60000)} min fa). Usa "Sincronizza".`);
    }
  } catch (err) {
    console.error('Sync iniziale fallita (la dashboard usa i dati già salvati):', (err as Error).message);
  }

  const app = express();
  app.use(express.json());
  // UI hi-fi (design canvas) come pagina principale su /
  app.use(express.static(resolve(projectRoot, 'ui')));
  // Vecchia dashboard minimale su /legacy
  app.use('/legacy', express.static(resolve(projectRoot, 'public')));

  // Dashboard del periodo (default: mese corrente, override con ?period=YYYY-MM)
  app.get('/api/dashboard', async (req, res) => {
    const period = typeof req.query.period === 'string' ? req.query.period : currentPeriod();
    res.json(await buildDashboard(store, period));
  });

  // Lista transazioni (filtri: ?period=, ?categoryId=, ?limit=)
  app.get('/api/transactions', async (req, res) => {
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    res.json(await store.listTransactions({ period, categoryId, limit }));
  });

  app.get('/api/categories', async (_req, res) => {
    res.json(await store.listCategories());
  });

  // Crea categoria. body: { name, monthlyThreshold, icon? }
  app.post('/api/categories', async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const monthlyThreshold = Number(req.body?.monthlyThreshold ?? 0);
    const icon = typeof req.body?.icon === 'string' && req.body.icon.trim() ? req.body.icon.trim() : undefined;
    if (!name) return res.status(400).json({ error: 'Nome categoria mancante' });
    try {
      res.json(await store.createCategory(name, monthlyThreshold, icon));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Aggiorna nome e/o soglia e/o icona. body: { name?, monthlyThreshold?, icon? }
  app.patch('/api/categories/:id', async (req, res) => {
    const id = Number(req.params.id);
    const fields: { name?: string; monthlyThreshold?: number; icon?: string } = {};
    if (typeof req.body?.name === 'string') fields.name = req.body.name.trim();
    if (req.body?.monthlyThreshold != null) fields.monthlyThreshold = Number(req.body.monthlyThreshold);
    if (typeof req.body?.icon === 'string' && req.body.icon.trim()) fields.icon = req.body.icon.trim();
    try {
      await store.updateCategory(id, fields);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Elimina categoria (le sue transazioni tornano senza categoria).
  app.delete('/api/categories/:id', async (req, res) => {
    try {
      await store.deleteCategory(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Re-etichetta una transazione e impara la regola esercente→categoria.
  // body: { categoryId: number | null }
  app.patch('/api/transactions/:id/category', async (req, res) => {
    const id = Number(req.params.id);
    const categoryId =
      req.body?.categoryId === null || req.body?.categoryId === undefined
        ? null
        : Number(req.body.categoryId);
    try {
      const result = await relabelTransaction(store, id, categoryId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Escludi/reincludi una transazione dai conteggi (resta visibile e nel DB).
  // Utile p.es. per una spesa anticipata e poi rimborsata. body: { excluded: boolean }
  app.patch('/api/transactions/:id/exclude', async (req, res) => {
    const id = Number(req.params.id);
    const excluded = req.body?.excluded !== false; // default: escludi
    try {
      await store.setTransactionExcluded(id, excluded);
      res.json({ ok: true, excluded });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Elimina definitivamente una transazione.
  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      await store.deleteTransaction(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Stato sincronizzazione: quando è (stimato) possibile risincronizzare.
  async function syncStatus() {
    const { lastSync, rateLimitedUntil } = await store.getSyncState();
    const now = Date.now();
    let nextMs = lastSync ? new Date(lastSync).getTime() + config.syncMinIntervalHours * 3600e3 : 0;
    if (rateLimitedUntil) nextMs = Math.max(nextMs, new Date(rateLimitedUntil).getTime());
    const rateLimited = !!rateLimitedUntil && now < new Date(rateLimitedUntil).getTime();
    return {
      lastSync,
      rateLimited,
      canSyncNow: now >= nextMs,
      nextSyncAt: nextMs > now ? new Date(nextMs).toISOString() : null,
      intervalHours: config.syncMinIntervalHours,
    };
  }

  app.get('/api/sync-status', async (_req, res) => res.json(await syncStatus()));

  // Forza un ciclo di import/aggregazione/notifiche (il pulsante "Sincronizza")
  app.post('/api/sync', async (_req, res) => {
    const status = await syncStatus();
    if (!status.canSyncNow) {
      // Non chiamare Hype: rispetta la cadenza minima / pausa per rate limit.
      return res.status(429).json({
        ok: false,
        rateLimited: status.rateLimited,
        nextSyncAt: status.nextSyncAt,
        error: status.rateLimited
          ? 'API Hype in pausa (limite raggiunto). Riprova più tardi.'
          : 'Sincronizzazione già recente. Attendi prima di rifarla.',
      });
    }
    try {
      const result = await runPipeline(store, createSource());
      await store.setRateLimitedUntil(null); // sync riuscita → l'API è disponibile
      res.json({
        ok: true,
        fetched: result.ingest.fetched,
        inserted: result.ingest.inserted,
        duplicates: result.ingest.duplicates,
        notifications: result.notifications.length,
        ...(await syncStatus()),
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      const rateLimited = /429|rate.?limit|access limit/i.test(msg);
      if (rateLimited) {
        const until = new Date(Date.now() + config.rateLimitBackoffHours * 3600e3).toISOString();
        await store.setRateLimitedUntil(until);
        return res.status(429).json({
          ok: false, rateLimited: true, nextSyncAt: until,
          error: 'Limite di sincronizzazioni di Hype raggiunto. Riprova più tardi.',
        });
      }
      res.status(502).json({ ok: false, error: 'Sincronizzazione non riuscita. Riprova più tardi.' });
    }
  });

  // Ascolta solo su loopback: la dashboard non è raggiungibile da altri
  // dispositivi sulla rete locale (per uso locale non serve esporla).
  app.listen(config.port, '127.0.0.1', () => {
    console.log(`Budget Tracker su http://localhost:${config.port}`);
    console.log(`  store=${config.store}  source=${config.source}  notify=${config.notifyChannel}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
