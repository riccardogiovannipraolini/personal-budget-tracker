import type { RawTransaction } from '../types.js';
import type { TransactionSource } from './source.js';

/**
 * Integrazione Tink (Open Banking) — STUB.
 *
 * Da completare quando l'accesso al piano sviluppatori Tink e il collegamento
 * Hype (provider it-hype-ob) sono validati. Flusso previsto:
 *   1. Client credentials -> access token (POST /api/v1/oauth/token)
 *   2. Consenso utente una tantum via Tink Link -> authorization code
 *   3. Scambio code -> user access token
 *   4. GET /data/v2/transactions (paginazione via cursor) dopo `sinceExternalId`
 *   5. Mappa i campi Tink su RawTransaction:
 *        externalId  <- transaction.id
 *        bookedAt    <- dates.booked
 *        amount      <- amount.value (segno: uscite negative)
 *        merchant    <- merchantInformation / descriptions.display
 *        rawCategory <- categories.pfm.id (o equivalente)
 *
 * Riferimenti: console.tink.com  ·  docs.tink.com
 */
export class TinkSource implements TransactionSource {
  readonly name = 'tink';

  constructor(
    private readonly opts: {
      clientId: string;
      clientSecret: string;
      environment: string;
    },
  ) {}

  async fetch(_sinceExternalId?: string | null): Promise<RawTransaction[]> {
    throw new Error(
      'TinkSource non ancora implementata. Validare l\'accesso Tink (console.tink.com) ' +
        'e completare il flusso OAuth/transactions. Per ora usa SOURCE=mock o SOURCE=csv.',
    );
  }
}
