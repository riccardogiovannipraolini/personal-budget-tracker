import 'dotenv/config';

/** Configurazione centralizzata, letta dall'ambiente con default sensati per la demo. */
export const config = {
  store: (process.env.STORE ?? 'memory') as 'memory' | 'pg',
  databaseUrl: process.env.DATABASE_URL ?? '',
  // 'verify' (default, sicuro) | 'no-verify' (solo debug, niente verifica certificato)
  databaseSsl: (process.env.DATABASE_SSL ?? 'verify') as 'verify' | 'no-verify',
  // Path (relativo alla root del progetto) al certificato CA del DB, se necessario.
  databaseCaCert: process.env.DATABASE_CA_CERT ?? '',

  source: (process.env.SOURCE ?? 'mock') as 'mock' | 'csv' | 'tink' | 'enablebanking',
  transactionsCsv: process.env.TRANSACTIONS_CSV ?? './sample-data/transactions.csv',

  tink: {
    clientId: process.env.TINK_CLIENT_ID ?? '',
    clientSecret: process.env.TINK_CLIENT_SECRET ?? '',
    environment: process.env.TINK_ENVIRONMENT ?? 'sandbox',
  },

  enableBanking: {
    applicationId: process.env.ENABLEBANKING_APP_ID ?? '',
    // Chiave privata: default .secrets/<appId>.pem, override con ENABLEBANKING_KEY_PATH.
    keyPath: process.env.ENABLEBANKING_KEY_PATH ?? '',
    redirectUrl: process.env.ENABLEBANKING_REDIRECT_URL ?? 'https://localhost:3000/callback',
    aspspName: process.env.ENABLEBANKING_ASPSP ?? 'HYPE',
    aspspCountry: process.env.ENABLEBANKING_COUNTRY ?? 'IT',
    psuType: process.env.ENABLEBANKING_PSU_TYPE ?? 'personal',
    // Dove salviamo la sessione di consenso (session_id, account_uid, scadenza).
    sessionPath: process.env.ENABLEBANKING_SESSION_PATH ?? '.secrets/enablebanking-session.json',
    baseUrl: 'https://api.enablebanking.com',
  },

  // Canale notifiche: console (default) | macos (native, full-local) | telegram | none
  notifyChannel: (process.env.NOTIFY ?? 'console') as 'console' | 'macos' | 'telegram' | 'none',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },

  // Sincronizzazione verso Notion (opzionale). NOTION_SYNC=on per agganciarla
  // allo scheduler; il comando `sync:notion` funziona comunque a prescindere.
  notion: {
    // off | on (push) | two-way (pull da Notion poi push) — aggancio allo scheduler.
    mode: (process.env.NOTION_SYNC ?? 'off') as 'off' | 'on' | 'two-way',
    // Mai in test: node --test non deve mai scrivere sul workspace Notion reale
    // (i test usano MemoryStore con dati finti, ma userebbero comunque le
    // credenziali vere di .env se non disattivato esplicitamente qui).
    enabled: (process.env.NOTION_SYNC ?? 'off') !== 'off' && process.env.NODE_ENV !== 'test',
    twoWay: (process.env.NOTION_SYNC ?? 'off') === 'two-way',
    token: process.env.NOTION_TOKEN ?? '',
    // Database esistente delle spese (es. "Spese — tracker"): riceve le uscite.
    speseDbId: process.env.NOTION_DB_SPESE ?? '',
    // Tabella "Categorie & Budget": se assente, l'app la crea sotto NOTION_PARENT_PAGE.
    categoriesDbId: process.env.NOTION_DB_CATEGORIES ?? '',
    // Pagina Notion sotto cui creare la tabella categorie la prima volta.
    parentPageId: process.env.NOTION_PARENT_PAGE ?? '',
    // Dove l'app memorizza gli ID dei database creati, per riusarli ai run successivi.
    statePath: process.env.NOTION_STATE_PATH ?? '.secrets/notion.json',
  },

  nearThresholdRatio: Number(process.env.NEAR_THRESHOLD_RATIO ?? '0.8'),

  port: Number(process.env.PORT ?? '3000'),
  pollCron: process.env.POLL_CRON ?? '0 */5 * * *',

  // Intervallo minimo consigliato tra sincronizzazioni (ore): protegge dal rate
  // limit PSD2/Hype e alimenta il countdown in dashboard.
  syncMinIntervalHours: Number(process.env.SYNC_MIN_INTERVAL_HOURS ?? '6'),
  // Stima di backoff dopo un 429 (ore), finché l'API non torna disponibile.
  rateLimitBackoffHours: Number(process.env.RATE_LIMIT_BACKOFF_HOURS ?? '6'),
};

/** Periodo corrente nel formato 'YYYY-MM' (mese di calendario). */
export function currentPeriod(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
