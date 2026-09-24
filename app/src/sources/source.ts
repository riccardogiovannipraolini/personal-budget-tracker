import type { RawTransaction } from '../types.js';

/**
 * Sorgente di transazioni. È l'unico punto da sostituire per passare
 * da dati finti/CSV all'integrazione Tink reale: il resto della pipeline non cambia.
 */
export interface TransactionSource {
  readonly name: string;
  /**
   * Recupera le transazioni disponibili. `sinceExternalId` è l'ultimo id già
   * importato: una sorgente può usarlo per ottimizzare, ma la deduplica
   * definitiva avviene comunque a valle (per external_id).
   */
  fetch(sinceExternalId?: string | null): Promise<RawTransaction[]>;
}
