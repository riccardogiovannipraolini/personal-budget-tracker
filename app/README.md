# Budget Tracker — MVP

App personale di monitoraggio budget: importa transazioni (Enable Banking / CSV), le categorizza,
le confronta con le soglie mensili e notifica (macOS / Telegram / console). Può inoltre sincronizzare
i dati su Notion. Il documento di progetto è in `../docs/`.

## Avvio rapido (zero configurazione)

```bash
npm install
npm run run:demo   # pipeline completa in memoria con dati finti, stampa la dashboard
npm run dev        # avvia la dashboard web su http://localhost:3000
```

`npm run dev` (senza `.env`) parte con `STORE=memory` e `SOURCE=mock`: nessun database né
banca richiesti. La dashboard fa un primo sync all'avvio; il pulsante **Sincronizza** ne forza altri.

## Setup locale completo (full-local, nessun cloud)

Tutto sulla tua macchina: Postgres locale + notifiche native macOS + import CSV. Nessun dato esce.

```bash
# 1. Postgres locale (una tantum)
brew install postgresql@16
brew services start postgresql@16
createdb budget

# 2. Configura .env
cp .env.example .env
#   STORE=pg
#   DATABASE_URL=postgresql://<tuo-utente>@localhost:5432/budget
#   SOURCE=csv   (oppure mock)
#   NOTIFY=macos

# 3. Schema + uso
npm run db:migrate   # crea tabelle + categorie
npm run run:once     # importa il CSV, notifica gli sforamenti
npm run dev          # dashboard su http://localhost:3000 (solo loopback)
```

Il server ascolta solo su `127.0.0.1`: non è raggiungibile da altri dispositivi in rete.
Migrare a Supabase più avanti = cambiare solo `DATABASE_URL` (nessuna modifica al codice).

## Architettura

Pipeline (`src/pipeline.ts`): **import → deduplica → categorizzazione → aggregazione/soglie → notifiche**.

Due astrazioni rendono l'MVP estensibile senza toccare la logica:

- **`TransactionSource`** (`src/sources/`) — da dove arrivano le transazioni.
  - `mock` (default), `csv` (export Hype), `enablebanking` (Open Banking PSD2 reale, conto Hype),
    `tink` (stub abbandonato).
- **`Store`** (`src/store/`) — dove si salvano i dati.
  - `memory` (default, demo/test) · `pg` (Postgres/Supabase, produzione).

Si cambia tutto da variabili d'ambiente (`.env`), nessuna modifica al codice.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run run:demo` | Pipeline in memoria + mock, stampa dashboard (autosufficiente) |
| `npm run run:once` | Un ciclo completo usando la config di `.env` |
| `npm run dev` | Dashboard web + API (hot reload) |
| `npm run scheduler` | Polling periodico (cron, default ogni 5h) |
| `npm run sync:notion` | Riversa transazioni + riepilogo del mese su Notion (`sync:notion 2026-06` per un altro periodo) |
| `npm test` | Test della pipeline |
| `npm run build && npm start` | Build + avvio di produzione |

## Passare a Supabase (Postgres)

1. Crea un progetto su [supabase.com](https://supabase.com) (free tier).
2. Copia `.env.example` in `.env` e imposta:
   ```
   STORE=pg
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
3. `npm run db:migrate` — applica `db/schema.sql` e il seed di `db/seed.sql`.
4. `npm run run:once` o `npm run dev`.

Lo schema canonico è in `db/schema.sql`; categorie e soglie iniziali in `db/seed.sql`.

## Notifiche

Canale scelto con `NOTIFY`: `console` (default) · `macos` (native, full-local) · `telegram` · `none`.

- **macOS** (`NOTIFY=macos`): notifiche native via `osascript`, nulla lascia la macchina.
- **Telegram** (`NOTIFY=telegram`): crea un bot con [@BotFather](https://t.me/BotFather) →
  `TELEGRAM_BOT_TOKEN`; ricava il `chat_id` da `https://api.telegram.org/bot<TOKEN>/getUpdates`;
  imposta entrambi in `.env`. Raggiunge anche il telefono ma passa dai server Telegram.

## Sincronizzare con Notion

Sync **one-way app → Notion**: l'app locale chiama in uscita l'API Notion. Il server e il
database non vengono mai esposti. Due destinazioni:

- **Uscite** → un database Spese esistente (es. "Spese — tracker"), `NOTION_DB_SPESE`.
  Mappa `Voce / Importo (€) / Data / Categoria / Metodo / Ricorrente / Note`; dedupe per
  transaction id nel campo `Note`; importi positivi. La **categoria è dinamica**: si scrive
  il nome reale dell'app e Notion (campo `select`) crea l'opzione se non esiste — nessuna
  mappatura fissa da mantenere.
- **Categorie + budget** → una tabella "Categorie & Budget" che **rispecchia le categorie vive**
  dell'app (`listCategories`) con budget mensile, speso e stato del periodo. Dinamica: crei o
  rinomini una categoria nell'app e alla sync successiva si riflette qui.

Setup una tantum:

1. **Integrazione**: Notion → *Settings → Connections → Develop → New integration* (interna).
   Token (`ntn_…`) → `.env` come `NOTION_TOKEN`.
2. **Condividi** con l'integrazione il database Spese e la pagina/tabella delle categorie
   (menu `•••` → *Connections*).
3. In `.env`: `NOTION_DB_SPESE=<id database spese>` e `NOTION_DB_CATEGORIES=<id tabella categorie>`
   (oppure `NOTION_PARENT_PAGE=<id pagina>` per far creare la tabella categorie all'app; l'ID
   viene salvato in `.secrets/notion.json` e riusato).
4. `npm run sync:notion` (o `npm run sync:notion 2026-06` per un altro mese).

Anteprima senza scrivere niente: `npm run sync:notion -- --dry-run`.
Rilanciare **aggiorna** le righe esistenti senza duplicarle (upsert). Con `NOTION_SYNC=on` la
sync parte in automatico a ogni ciclo dello scheduler.

### Bidirezionale (Notion → app)

Con `NOTION_SYNC=two-way` (o `npm run sync:notion:2way`, o `npm run pull:notion` per la sola
pull) le modifiche fatte **in Notion** rientrano nell'app:

- **Ricategorizzazione**: cambi la `Categoria` di una spesa in "Spese — tracker" → l'app aggiorna
  la transazione e **impara** la regola esercente→categoria (come dalla UI).
- **Budget e rinomina categoria**: cambi il `Budget mensile (€)` o il nome nella tabella
  "Categorie & Budget" → l'app aggiorna soglia/nome. Identità per `Key` (`periodo·categoryId`,
  scritta dall'app alla creazione): una rinomina resta la stessa categoria, non ne crea un'altra.
- **Categoria nuova**: aggiungi una riga senza `Key` nella tabella categorie → l'app la crea
  (o l'aggancia a una categoria esistente con lo stesso nome, senza duplicarla).
- **Contanti / manuali**: aggiungi una riga senza `Note` in "Spese — tracker" → viene inserita
  nell'app (poi la push le scrive il `Note` per collegarla).

Anteprima senza scrivere niente: `npm run pull:notion -- --dry-run` (non avanza nemmeno il
watermark). Utile prima di una two-way su dati reali.

Il ciclo è **pull → applica → push**. Due garanzie contro i loop:
- **Watermark** (`.secrets/notion.json`): si processano solo le pagine modificate dopo l'ultimo pull.
  Il **primo pull fa solo da baseline** (fissa il watermark, non applica lo storico).
- **Autore**: si ignorano le modifiche fatte dall'integrazione stessa (le nostre push).

### Regola di conflitto (proprietà per-campo)

Identità stabile di ogni movimento: **`external_id`** (nel campo `Note`, scritto una sola volta).
Ogni campo ha **una sola fonte autorevole**, quindi non esistono conflitti sullo stesso campo:

| Campo | Fonte autorevole | Comportamento |
|---|---|---|
| Importo, Data, Voce | **App** (contabilità) | la push li aggiorna sempre |
| `Speso / Residuo / Stato` (categorie) | **App** (calcolati) | la push li aggiorna sempre |
| Categoria (spesa) | **Notion** (correzione) | seed alla creazione, poi la push **non** la tocca; il pull la porta nell'app |
| Metodo, Ricorrente | **Notion** (manuali) | seed alla creazione, poi mai sovrascritti |
| Nome categoria, `Budget mensile` | **Notion** (correzione) | seed alla creazione, poi la push **non** li tocca; il pull li porta nell'app (per `Key`, non per nome) |

Così Notion è un **punto di correzione manuale** senza rompere la contabilità: l'app resta padrona
di importi/date/nuovi movimenti, Notion di categoria/budget/flag.

Vincoli anti-duplicati:
- Nella tabella **categorie**, l'identità è la `Key` (`periodo·categoryId`, scritta dall'app):
  rinominare una riga esistente aggiorna quella categoria, non ne crea un'altra. Una riga **nuova**
  senza `Key` viene agganciata a una categoria esistente con lo stesso nome (case-insensitive) se
  c'è, altrimenti ne crea una nuova nell'app.
- Nella `Categoria` (select) delle **spese**, il match resta per **nome esatto**: dopo una rinomina,
  ricategorizza le spese scegliendo il **nuovo** nome dal select (quelle già createsi con il nome
  vecchio restano tali finché non le tocchi).

Fuori ambito: le **cancellazioni** in Notion non si propagano (una riga cancellata verrà ricreata
alla push); una `Categoria` **vuota** in Notion non azzera la categoria nell'app.

## Importare un CSV reale (estratto Hype)

```
SOURCE=csv
TRANSACTIONS_CSV=./percorso/al/tuo/export.csv
```
Colonne attese: `external_id, date, amount, merchant, description, category` — `amount` negativo = uscita.

## Open Banking reale — Enable Banking (conto Hype)

L'integrazione Open Banking **attiva** è Enable Banking (PSD2), in `src/enablebanking/`:

```
SOURCE=enablebanking
ENABLEBANKING_APP_ID=<application id>
ENABLEBANKING_ASPSP=HYPE
ENABLEBANKING_COUNTRY=IT
```

La chiave privata sta in `.secrets/<APP_ID>.pem`. Il consenso (~180 giorni) si ottiene una tantum:

```
npm run auth   # flusso di consenso interattivo → sessione in .secrets/enablebanking-session.json
```

Poi `npm run run:once` / `npm run dev` importano dal conto reale. Rate limit PSD2: poche
sincronizzazioni al giorno, quindi la sync allo startup parte solo se l'ultima è > 4h fa.

> `src/sources/tinkSource.ts` resta uno **stub abbandonato**: Tink non è più la strada. Usa `enablebanking`.
