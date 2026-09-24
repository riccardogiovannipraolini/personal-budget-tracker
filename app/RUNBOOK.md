# Runbook — Budget Tracker

Comandi operativi rapidi. Dettagli in `README.md`, note di sviluppo in `CLAUDE.md`.

## Avvio quotidiano

- **Icona** (opzionale): un'app macOS creata con osacompile che lancia `scripts/launch.sh` — avvia Postgres, il server e apre la dashboard.
- **Manuale**: assicurati che Postgres locale sia acceso, poi:
  ```bash
  npm run dev        # server + dashboard su http://localhost:3000
  ```
- Nella dashboard, premi **Sincronizza** per: scaricare i movimenti dalla banca,
  aggiornare Notion e recepire le correzioni fatte in Notion (modalità two-way).

## Notion — sincronizzazione

La sync gira dentro la pipeline (avvio server se ultima sync >4h, e bottone Sincronizza).
Modalità impostata da `NOTION_SYNC` in `.env`: `off` | `on` (solo push) | `two-way` (pull+push).

| Comando | Cosa fa |
|---|---|
| `npm run sync:notion` | Push app → Notion (spese + categorie/budget) del mese corrente |
| `npm run sync:notion 2026-06` | Push di un altro mese |
| `npm run sync:notion -- --dry-run` | Anteprima, non scrive nulla |
| `npm run sync:notion:2way` | Bidirezionale: pull correzioni da Notion, poi push |
| `npm run pull:notion` | Solo pull (Notion → app) |
| `npm run pull:notion -- --dry-run` | Anteprima della pull, non scrive nulla (né watermark) |

Regola di conflitto: **app** possiede importi/date/movimenti; **Notion** possiede
categoria/budget/flag/nome-categoria (correzioni manuali). Identità: `external_id` (campo `Note`)
per le spese, `Key` (`periodo·categoryId`) per le categorie — rinominare una categoria in Notion
la rinomina anche nell'app, senza duplicarla. Per ricategorizzare una spesa usa i **nomi-categoria
correnti dell'app** nel select (dopo una rinomina, quello nuovo).

## Sync automatica in background (opzionale)

```bash
npm run scheduler   # esegue la pipeline (incl. Notion) ogni 5h (POLL_CRON)
```
Avviare l'app NON avvia lo scheduler: è un processo separato.

## Manutenzione

| Comando | Cosa fa |
|---|---|
| `npm run recategorize` | Riapplica le regole di categorizzazione ai dati salvati |
| `npm run auth` | Ri-consenso Enable Banking (~180 gg) quando scade |
| `npm run db:migrate` | Applica schema + seed (idempotente) |
| `npx tsc --noEmit` | Type-check (non c'è linter) |
| `npm test` | Test della pipeline |

## Configurazione (`.env`, non versionato)

Chiavi Notion: `NOTION_SYNC`, `NOTION_TOKEN`, `NOTION_DB_SPESE`, `NOTION_DB_CATEGORIES`.
Gli ID dei database creati dall'app e il watermark del pull stanno in `.secrets/notion.json`.
`.env` e `.secrets/` NON vanno su GitHub: contengono token e chiavi private.
