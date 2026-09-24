import { config, currentPeriod } from '../config.js';
import { relabelTransaction } from '../categorize.js';
import type { Store } from '../store/index.js';
import {
  ensureCategoriesDb,
  getBotId,
  getStateValue,
  notionRequest,
  prop,
  queryEditedSince,
  rt,
  setStateValue,
  type EditedPage,
} from './notionClient.js';

export interface PullResult {
  recategorized: number;
  inserted: number;
  budgetsUpdated: number;
  renamed: number;
  categoriesCreated: number;
  skipped: number;
}

export interface PullOptions {
  /** Non scrive né su Postgres né su Notion, non avanza il watermark: solo anteprima. */
  dryRun?: boolean;
}

const WATERMARK_KEY = 'lastPull';

/** externalId stabile per una spesa inserita manualmente in Notion. */
function manualExternalId(pageId: string): string {
  return 'notion-' + pageId.replace(/-/g, '');
}

/** Estrae l'id categoria numerico da una Key `period·categoryId` (es. "2026-07·28"). */
function parseCategoryKey(key: string): number | null {
  const m = /^\d{4}-\d{2}·(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

/** Aggiorna il watermark al massimo last_edited_time visto (garantisce avanzamento). */
function maxEdited(pages: EditedPage[], previous?: string): string | undefined {
  let max = previous;
  for (const p of pages) {
    if (!max || p.last_edited_time > max) max = p.last_edited_time;
  }
  return max;
}

/**
 * Flusso inverso Notion → app. Applica all'app le modifiche fatte da un umano in
 * Notion dopo l'ultimo pull:
 *  - ricategorizzazioni in "Spese — tracker" (con apprendimento, via relabelTransaction);
 *  - inserimenti manuali/contanti (righe senza Note) → nuove transazioni nell'app;
 *  - modifiche ai budget nella tabella "Categorie & Budget".
 * Anti-loop: ignora le pagine la cui ultima modifica è del bot (le nostre push).
 */
export async function pullFromNotion(store: Store, opts: PullOptions = {}): Promise<PullResult> {
  const dryRun = !!opts.dryRun;
  const result: PullResult = {
    recategorized: 0,
    inserted: 0,
    budgetsUpdated: 0,
    renamed: 0,
    categoriesCreated: 0,
    skipped: 0,
  };
  if (!config.notion.speseDbId) {
    console.log('⚠ NOTION_DB_SPESE non impostato: niente pull dalle spese.');
  }

  const botId = await getBotId();
  const since = await getStateValue(WATERMARK_KEY);

  // Query iniziale delle pagine (filtrate per last_edited_time se abbiamo un watermark).
  const spesePages: EditedPage[] = config.notion.speseDbId
    ? await queryEditedSince(config.notion.speseDbId, since)
    : [];
  let catPages: EditedPage[] = [];
  let categoriesDbId: string | undefined;
  try {
    categoriesDbId = await ensureCategoriesDb();
    catPages = await queryEditedSince(categoriesDbId, since);
  } catch (err) {
    console.log('  pull: tabella categorie non disponibile:', (err as Error).message);
  }

  // Primo pull (nessun watermark): NON applicare lo storico. Fissa solo il
  // watermark a "adesso", così la bidirezionalità reagisce solo agli edit futuri.
  if (!since) {
    if (dryRun) {
      console.log('[dry-run] Primo pull: fisserebbe solo il watermark, nessuna modifica storica.');
      return result;
    }
    const wm = maxEdited([...spesePages, ...catPages]) ?? new Date().toISOString();
    await setStateValue(WATERMARK_KEY, wm);
    console.log('Primo pull: watermark inizializzato, nessuna modifica storica applicata.');
    return result;
  }

  // Mappe di lookup dall'app.
  const cats = await store.listCategories();
  const catIdByName = new Map(cats.map((c) => [c.name, c.id]));
  const catById = new Map(cats.map((c) => [c.id, c]));
  const txns = await store.listTransactions({ limit: 100000 });
  const txByExternalId = new Map(txns.map((t) => [t.externalId, t]));

  const isHuman = (p: EditedPage) => p.last_edited_by?.id !== botId;

  // ── 1) Spese — tracker: ricategorizzazioni + inserimenti manuali ──────────
  {
    for (const page of spesePages.filter(isHuman)) {
      const note = prop.richText(page.properties['Note']);
      const catName = prop.select(page.properties['Categoria']);
      const catId = catName ? catIdByName.get(catName) ?? null : null;

      if (note) {
        // Transazione esistente: applica la nuova categoria SOLO se scelta in Notion.
        const tx = txByExternalId.get(note);
        if (!tx) {
          result.skipped++;
          continue;
        }
        // Categoria vuota in Notion = nessuna informazione → non toccare l'app.
        if (!catName) continue;
        if (catId == null) {
          console.log(`  pull: categoria "${catName}" sconosciuta all'app → skip (${note}).`);
          result.skipped++;
          continue;
        }
        if (tx.categoryId !== catId) {
          if (dryRun) {
            console.log(`  [dry-run] ricategorizzerebbe tx ${tx.id} → "${catName}" (${note}).`);
          } else {
            await relabelTransaction(store, tx.id, catId);
          }
          result.recategorized++;
        }
      } else {
        // Riga senza Note = inserimento manuale (es. contanti).
        const externalId = manualExternalId(page.id);
        if (await store.transactionExists(externalId)) {
          result.skipped++;
          continue;
        }
        const date = prop.date(page.properties['Data']);
        const importo = prop.number(page.properties['Importo (€)']);
        const voce = prop.title(page.properties['Voce']);
        if (!date || importo == null) {
          result.skipped++;
          continue;
        }
        if (dryRun) {
          console.log(`  [dry-run] inserirebbe transazione manuale: ${date}  ${voce}  ${importo} €.`);
        } else {
          await store.insertTransaction(
            { externalId, bookedAt: date, amount: -Math.abs(importo), merchant: voce || 'Manuale' },
            catId,
          );
          // Scrivi il Note sulla pagina così la push futura la aggiorna invece di duplicarla.
          await notionRequest('/pages/' + page.id, 'PATCH', { properties: { Note: rt(externalId) } });
        }
        result.inserted++;
      }
    }
  }

  // ── 2) Categorie & Budget: rinomine, budget e nuove categorie ─────────────
  // Identità = Key (period·categoryId), non il nome: una riga rinominata resta
  // la STESSA categoria. Non si filtra per isHuman: se la push (bot) tocca
  // Speso/Residuo/Stato dopo un edit umano, last_edited_by diventa il bot e
  // l'edit umano andrebbe perso. Qui è sicuro perché nome/budget si applicano
  // per value-diff (no-op se già allineati) — non c'è rischio di loop.
  const period = currentPeriod();
  for (const page of catPages) {
    const title = prop.title(page.properties['Categoria']);
    if (!title) continue;
    const budget = prop.number(page.properties['Budget mensile (€)']);
    const key = prop.richText(page.properties['Key']);
    const keyedId = key ? parseCategoryKey(key) : null;

    if (keyedId != null) {
      if (keyedId === 0) continue; // bucket "Senza categoria": non gestito
      const existing = catById.get(keyedId);
      if (!existing) {
        console.log(`  pull: categoria id ${keyedId} (Key "${key}") non esiste più nell'app → skip.`);
        result.skipped++;
        continue;
      }
      if (title !== existing.name) {
        if (dryRun) {
          console.log(`  [dry-run] rinominerebbe categoria #${keyedId}: "${existing.name}" → "${title}".`);
        } else {
          try {
            await store.updateCategory(keyedId, { name: title });
          } catch (err) {
            console.log(`  pull: rinomina "${existing.name}"→"${title}" fallita: ${(err as Error).message}`);
            result.skipped++;
            continue;
          }
        }
        result.renamed++;
      }
      if (budget != null && budget !== existing.monthlyThreshold) {
        if (dryRun) {
          console.log(`  [dry-run] budget categoria #${keyedId} "${title}": ${existing.monthlyThreshold} → ${budget} €.`);
        } else {
          await store.updateCategory(keyedId, { monthlyThreshold: budget });
        }
        result.budgetsUpdated++;
      }
    } else {
      // Riga senza Key: categoria nuova creata direttamente in Notion.
      const byName = cats.find((c) => c.name.toLowerCase() === title.toLowerCase());
      if (byName) {
        // Già esiste nell'app con lo stesso nome: aggancia la Key, non duplicare.
        if (dryRun) {
          console.log(`  [dry-run] aggancerebbe la riga "${title}" alla categoria esistente #${byName.id}.`);
        } else {
          await notionRequest('/pages/' + page.id, 'PATCH', {
            properties: { Key: rt(`${period}·${byName.id}`), Periodo: rt(period) },
          });
        }
        continue;
      }
      if (dryRun) {
        console.log(`  [dry-run] creerebbe categoria "${title}" (budget ${budget ?? 0} €).`);
      } else {
        const created = await store.createCategory(title, budget ?? 0);
        await notionRequest('/pages/' + page.id, 'PATCH', {
          properties: { Key: rt(`${period}·${created.id}`), Periodo: rt(period) },
        });
      }
      result.categoriesCreated++;
    }
  }

  // ── Avanza il watermark ───────────────────────────────────────────────────
  if (!dryRun) {
    const newWatermark = maxEdited([...spesePages, ...catPages], since);
    if (newWatermark) await setStateValue(WATERMARK_KEY, newWatermark);
  }

  return result;
}
