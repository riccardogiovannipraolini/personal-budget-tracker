import {
  getTransactions,
  type EbTransaction,
} from '../enablebanking/client.js';
import { isSessionValid, loadSession } from '../enablebanking/session.js';
import type { RawTransaction } from '../types.js';
import type { TransactionSource } from './source.js';
import { guessRawCategory } from './merchantCategories.js';

const MAX_PAGES = 50;

/**
 * Sorgente reale: legge le transazioni dei conti collegati via Enable Banking.
 * Richiede una sessione di consenso valida (creala con `npm run auth`).
 */
export class EnableBankingSource implements TransactionSource {
  readonly name = 'enablebanking';

  /** Finestra di recupero: per default ultimi 90 giorni (la deduplica evita doppioni). */
  constructor(private readonly lookbackDays = 90) {}

  async fetch(): Promise<RawTransaction[]> {
    const session = loadSession();
    if (!isSessionValid(session)) {
      throw new Error(
        'Sessione Enable Banking assente o scaduta. Esegui `npm run auth` per (ri)autorizzare il conto.',
      );
    }

    const dateFrom = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const out: RawTransaction[] = [];
    for (const accountUid of session.accountUids) {
      let continuationKey: string | undefined;
      let pages = 0;
      do {
        const page = await getTransactions(accountUid, { dateFrom, continuationKey });
        for (const tx of page.transactions) {
          // Solo transazioni contabilizzate: id stabile per la deduplica.
          if (tx.status !== 'BOOK') continue;
          const mapped = mapTransaction(tx);
          // Escludi i trasferimenti interni (giroconti): non sono spese.
          if (isTransfer(`${mapped.merchant ?? ''} ${mapped.description ?? ''}`)) continue;
          out.push(mapped);
        }
        continuationKey = page.continuation_key;
        pages++;
      } while (continuationKey && pages < MAX_PAGES);
    }
    return out;
  }
}

/** Trasferimenti interni / giroconti: da escludere dalle spese. */
export function isTransfer(text: string | undefined): boolean {
  return /\bgiroconto\b|\bgirofondi\b|giro ?conto|trasferimento interno/i.test(text ?? '');
}

/** Mappa una transazione Enable Banking sul modello interno. */
function mapTransaction(tx: EbTransaction): RawTransaction {
  const magnitude = Math.abs(Number(tx.transaction_amount.amount));
  const amount = tx.credit_debit_indicator === 'DBIT' ? -magnitude : magnitude;

  // La controparte: per un'uscita è il creditore, per un'entrata il debitore.
  const counterparty =
    (tx.credit_debit_indicator === 'DBIT' ? tx.creditor?.name : tx.debtor?.name) ??
    tx.remittance_information?.[0];

  const description =
    tx.remittance_information?.join(' ') || tx.bank_transaction_code?.description || counterparty;

  const bookedAt = tx.booking_date ?? tx.value_date ?? tx.transaction_date ?? '';

  // external_id stabile per la deduplica.
  const externalId =
    tx.transaction_id ||
    tx.entry_reference ||
    `eb-${bookedAt}-${amount}-${(counterparty ?? '').slice(0, 20)}`;

  return {
    externalId,
    bookedAt,
    amount,
    merchant: counterparty,
    description,
    rawCategory: guessRawCategory(`${counterparty ?? ''} ${description ?? ''}`),
  };
}
