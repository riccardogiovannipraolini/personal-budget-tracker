import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';
import { config } from '../config.js';

const eb = config.enableBanking;

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Percorso della chiave privata: esplicito o, di default, .secrets/<appId>.pem */
export function resolveKeyPath(): string {
  if (eb.keyPath) return resolve(process.cwd(), eb.keyPath);
  return resolve(process.cwd(), '.secrets', `${eb.applicationId}.pem`);
}

/** JWT RS256 per l'autenticazione all'API Enable Banking. */
function makeJwt(): string {
  if (!eb.applicationId) {
    throw new Error('ENABLEBANKING_APP_ID mancante in .env');
  }
  const privateKey = readFileSync(resolveKeyPath(), 'utf8');
  const header = { typ: 'JWT', alg: 'RS256', kid: eb.applicationId };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 1800,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${b64url(signer.sign(privateKey))}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${eb.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${makeJwt()}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Enable Banking ${method} ${path} → ${res.status}: ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// ─── Tipi di risposta (sottoinsieme dei campi usati) ─────────────────────────

export interface StartAuthResponse {
  url: string;
  authorization_id?: string;
}

export interface SessionAccount {
  uid: string;
  identification_hash?: string;
  account_id?: { iban?: string; other?: { identification?: string } };
}

export interface CreateSessionResponse {
  session_id: string;
  accounts: SessionAccount[];
  access?: { valid_until?: string };
}

export interface EbTransaction {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { currency: string; amount: string };
  credit_debit_indicator: 'CRDT' | 'DBIT';
  status: 'BOOK' | 'PDNG';
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  creditor?: { name?: string };
  debtor?: { name?: string };
  remittance_information?: string[];
  bank_transaction_code?: { description?: string; code?: string; sub_code?: string };
}

export interface TransactionsResponse {
  transactions: EbTransaction[];
  continuation_key?: string;
}

// ─── Chiamate ────────────────────────────────────────────────────────────────

/** Avvia il flusso di consenso: ritorna l'URL a cui mandare l'utente. */
export function startAuth(opts: { validUntil: string; state: string }): Promise<StartAuthResponse> {
  return request<StartAuthResponse>('POST', '/auth', {
    access: { valid_until: opts.validUntil },
    aspsp: { name: eb.aspspName, country: eb.aspspCountry },
    state: opts.state,
    redirect_url: eb.redirectUrl,
    psu_type: eb.psuType,
  });
}

/** Scambia il `code` del redirect per una sessione con la lista conti. */
export function createSession(code: string): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('POST', '/sessions', { code });
}

/** Una pagina di transazioni del conto. */
export function getTransactions(
  accountUid: string,
  opts: { dateFrom?: string; continuationKey?: string } = {},
): Promise<TransactionsResponse> {
  const qs = new URLSearchParams();
  if (opts.dateFrom) qs.set('date_from', opts.dateFrom);
  if (opts.continuationKey) qs.set('continuation_key', opts.continuationKey);
  const q = qs.toString();
  return request<TransactionsResponse>(
    'GET',
    `/accounts/${accountUid}/transactions${q ? `?${q}` : ''}`,
  );
}
