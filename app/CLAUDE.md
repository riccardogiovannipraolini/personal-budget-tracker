# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Budget tracker personale: importa transazioni dal conto Hype (via Enable Banking, Open Banking PSD2), le categorizza, le confronta con soglie mensili e notifica. Backend Node + TypeScript (ESM), Postgres, UI React servita come prototipo Babel-in-browser. Documento di progetto: `../docs/documento-di-progetto-2026-05-31.pdf`.

## Comandi

```bash
npm run dev          # server + UI con hot-reload (tsx watch) → http://localhost:3000
npm run run:once     # un ciclo pipeline completo usando .env (import→categorizza→soglie→notifica)
npm run run:demo     # pipeline in-memory con dati mock, stampa dashboard a terminale (zero config)
npm run recategorize # riapplica le regole di categorizzazione ai dati salvati (senza ri-scaricare)
npm run auth         # flusso di consenso Enable Banking una tantum (consenso ~180gg in .secrets/)
npm run db:migrate   # applica db/schema.sql + seed (idempotente) — richiede STORE=pg
npm run scheduler    # polling periodico (cron POLL_CRON)
npm test             # tutti i test (node:test runner)
npm run build && npm start  # build TS → dist/ e avvio di produzione
```

Test singolo per nome: `node --test --import tsx --test-name-pattern "deduplica" test/pipeline.test.ts`.
Non c'è linter configurato; il "check" è `npx tsc --noEmit`.

## Architettura — il quadro generale

La pipeline (`src/pipeline.ts`: `runPipeline`) dipende **solo da due interfacce**, ed è questo che rende il sistema estensibile:

- **`TransactionSource`** (`src/sources/`, factory `createSource` su `SOURCE=`): da dove arrivano le transazioni. `mock` | `csv` | `enablebanking` (reale) | `tink` (stub abbandonato). Sostituire la sorgente non tocca il resto.
- **`Store`** (`src/store/`, factory `createStore` su `STORE=`): persistenza. `memory` (test/demo) | `pg` (Postgres/Supabase, produzione). La pipeline non sa quale usa.

Flusso: `ingest` (dedup per `external_id` + categorizza + salva) → `aggregate.buildDashboard` (speso per categoria/periodo vs soglia, + bucket "Senza categoria") → `notify` (canale `NOTIFY=` via `src/notifiers/`).

### Categorizzazione (con apprendimento)
`src/categorize.ts::resolveCategoryId` decide la categoria in quest'ordine di priorità:
1. **regola imparata** dall'utente per quell'esercente (tabella `merchant_rule`, chiave = `normalizeMerchant(merchant)`);
2. `raw_category` memorizzata/fornita → tabella `category_mapping`;
3. fallback: `guessRawCategory(merchant+causale)` (regex in `src/sources/merchantCategories.ts`) → `category_mapping`.

Re-etichettare dalla UI (`relabelTransaction`) **impara**: salva la regola e applica la categoria a tutte le transazioni dello stesso esercente (passate e future). Enable Banking NON fornisce categorie di spesa: la categorizzazione è interamente nostra (regex + apprendimento).

### Enable Banking (Open Banking reale)
`src/enablebanking/`: `client.ts` (auth JWT RS256 firmato con la chiave privata in `.secrets/<appId>.pem`; chiamate /auth, /sessions, /accounts/{uid}/transactions), `auth.ts` (consenso interattivo una tantum → sessione in `.secrets/enablebanking-session.json`), `session.ts`. **Rate limit PSD2**: poche sincronizzazioni/giorno → la sync allo startup di `server.ts` parte solo se l'ultima è > 4h fa, e `/api/sync` gestisce il 429 con messaggio. I trasferimenti/giroconti sono esclusi (`isTransfer` in `enableBankingSource.ts`).

### UI (`ui/`) — attenzione
È un **export dal design canvas di Claude**: React caricato via Babel-standalone da CDN, **niente build, niente moduli**. La UI live è il **redesign "minimal audace" v3** nei file `rd-*.jsx` + `rd-styles.css`; condividono variabili globali su `window` (non import/export). I vecchi `app-hifi.jsx`/`hf-*.jsx`/`hifi.css` restano su disco come **backup non caricato** (più `index.hifi.html.bak`, `eb-bridge.jsx.bak`). Quindi:
- `index.html` è il **boot shell**: scarica `/api/*` in `window.__API`, poi inietta gli script (`rd-tweaks-panel`, `rd-data`, `rd-charts`, `rd-dashboard`, `rd-categories`, `rd-notifications`, `rd-detail`, poi `eb-bridge.jsx` PRIMA di `rd-app.jsx`) e chiama `Babel.transformScriptTags()`. Servito su `/` da Express.
- **`eb-bridge.jsx` è la colla di integrazione**: sovrascrive il layer mock di `rd-data.jsx` (`buildCategories`/`TXNS`/`HISTORY`/`MONTHS6`/`DEFAULT_THRESHOLDS`) coi dati reali dell'API, espone `window.__relabel/__setExcluded/__deleteTransaction/__createCategory/__renameCategory/__deleteCategory/__setCategoryIcon/__saveThreshold` e `__refreshData`+`__onData` per l'**aggiornamento in-place** (NON usare `window.location.reload`). Le icone (nomi tipo chip/package/receipt/scissors) devono esistere nell'`Ico` di `rd-data.jsx`; la lista proposta nel picker è `PICK_ICONS`.
- **Navigazione: 3 voci** (Panoramica/Categorie/Notifiche) — NON c'è pagina Impostazioni (rimossa apposta, il redesign è minimal). Rinomina+elimina categoria sono **inline** sia in `rd-categories.jsx` (input `NameField` + bottone `.row-del` su hover) sia in `rd-detail.jsx` (header: nome editabile + cestino). L'icona si cambia cliccando il badge `.cico` (componente condiviso `IconPicker` in `rd-charts.jsx`: popover con la griglia `PICK_ICONS`), disponibile sia in Categorie che in Dettaglio. La soglia si edita inline nel Detail (`InlineThreshold`); "Nuova categoria" è il modal nella pagina Categorie (nome+soglia+icona). Il bucket `'senza'` non è rinominabile/eliminabile/con icona modificabile (guardia `id !== 'senza'`). `NameField`/`IconPicker` sono componenti condivisi definiti in `rd-charts.jsx`.
- Modificando i file di design (es. nuovi export dal canvas), **preservare** queste integrazioni: le azioni transazione in `rd-detail.jsx` (escludi/riassegna/elimina → `__setExcluded`/`__relabel`/`__deleteTransaction`; reassign mappa `'senza'`→`''`), rinomina/elimina/cambio icona categoria in Categorie+Detail (`__renameCategory`/`__deleteCategory`/`__setCategoryIcon`), il wiring CRUD + sync in `rd-app.jsx`, il refresh in-place.
- Gli id-categoria della UI = id numerici del backend (`String(categoryId)`), `'senza'` per il bucket non categorizzato. L'icona è **persistita per categoria** (colonna `category.icon`, editabile dall'utente); `eb-bridge.jsx` la legge da `/api/categories` e usa `nameToIcon` solo come fallback per categorie senza icona salvata.

## Gotcha specifici

- **Date Postgres**: `pgStore.ts` imposta un type parser per l'oid `1082` (DATE) che restituisce la stringa grezza — evita lo slittamento di un giorno causato da `toISOString()` (timezone). Non convertire le colonne `date` con `toISOString`.
- **Due seed da tenere sincronizzati**: `db/seed.sql` (Postgres) e `src/seedData.ts` (MemoryStore) devono avere le stesse categorie/mapping. Categorie e budget di default sono valori d'esempio.
- **Eliminare una categoria** azzera i `category_id` delle sue transazioni (FK ON DELETE SET NULL) e cascata su mapping/soglie/regole.
- **Segreti**: `.env`, `.secrets/` (chiave Enable Banking, sessione) sono gitignored; mai committarli.
- **Avvio "a icona"**: (opzionale) un'app macOS creata con osacompile può lanciare `scripts/launch.sh` (Postgres locale via brew `postgresql@16` + `npm run dev` + apre il browser). Node via nvm, se presente.

## Modello dati (Postgres)
`transaction` (con `external_id` per dedup, `category_id`), `category` (`monthly_threshold`), `category_mapping` (raw→categoria), `merchant_rule` (esercente normalizzato→categoria, imparate), `budget_period` (aggregato speso/soglia), `sync_state` (singleton). Schema in `db/schema.sql`.
