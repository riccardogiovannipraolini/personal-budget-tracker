import { guessRawCategory } from './sources/merchantCategories.js';
import type { Store } from './store/index.js';
import type { RawTransaction } from './types.js';

/**
 * Normalizza il nome esercente in una chiave stabile, così varianti dello stesso
 * negozio combaciano: "PALESTRA TORINO SRL TO" e "PALESTRA TORINO" → "PALESTRA TORINO".
 * Toglie forme societarie, numeri, punteggiatura e la sigla provincia finale.
 */
// Sigle provincia italiane (per togliere il suffisso "… TO" senza eliminare
// parole di 2 lettere legittime come "AI" di "Perplexity AI").
const PROVINCE = new Set(
  ('AG AL AN AO AP AQ AR AT AV BA BG BI BL BN BO BR BS BT BZ CA CB CE CH CL CN CO CR CS CT CZ EN FC FE FG FI FM FR GE GO GR IM IS KR LC LE LI LO LT LU MB MC ME MI MN MO MS MT NA NO NU OR PA PC PD PE PG PI PN PO PR PT PU PV PZ RA RC RE RG RI RM RN RO SA SI SO SP SR SS SU SV TA TE TN TO TP TR TS TV UD VA VB VC VE VI VR VT VV')
    .split(' '),
);

export function normalizeMerchant(merchant: string | undefined): string {
  if (!merchant) return '';
  let s = merchant.toUpperCase().replace(/['`’.,/*#+\-]/g, ' ');
  // prefissi/parole generiche del circuito di pagamento
  s = s.replace(/\b(PAGAMENTO|ACQUISTO|ADDEBITO|PRESSO|POS|CARTA|BONIFICO|SDD|SEPA|WWW|HTTPS?)\b/g, ' ');
  // forme societarie
  s = s.replace(/\b(S\.?R\.?L\.?S?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|SEMPLIFICATA|DI)\b/g, ' ');
  s = s.replace(/\b\d+\b/g, ' '); // numeri isolati (codici negozio, ecc.)

  let tokens = s.split(/\s+/).filter(Boolean);
  // togli la sigla provincia finale, se valida
  if (tokens.length > 1 && PROVINCE.has(tokens[tokens.length - 1]!)) tokens.pop();
  // dedup dei token ripetuti mantenendo l'ordine (es. "TORINO … TORINO")
  const seen = new Set<string>();
  tokens = tokens.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  return tokens.join(' ');
}

/**
 * Determina la categoria di una transazione, in ordine di priorità:
 *  1. regola imparata dall'utente per quell'esercente (merchant_rule)
 *  2. mappatura della raw_category (categoria grezza/regex)
 * Ritorna l'id categoria o null se non determinabile.
 */
export async function resolveCategoryId(
  store: Store,
  t: Pick<RawTransaction, 'merchant' | 'description' | 'rawCategory'>,
): Promise<number | null> {
  const key = normalizeMerchant(t.merchant);
  if (key) {
    const learned = await store.getCategoryByMerchant(key);
    if (learned != null) return learned;
  }
  // Prova la raw_category fornita/memorizzata; se non mappa (es. chiave vecchia),
  // ricalcola dal nome esercente/causale.
  if (t.rawCategory) {
    const byStored = await store.getCategoryIdForRaw(t.rawCategory);
    if (byStored != null) return byStored;
  }
  const guessed = guessRawCategory(`${t.merchant ?? ''} ${t.description ?? ''}`);
  return store.getCategoryIdForRaw(guessed);
}

export interface RelabelResult {
  categoryId: number | null;
  merchantKey: string;
  updatedCount: number; // quante transazioni (incl. quella scelta) sono state aggiornate
  learned: boolean; // true se è stata salvata una regola riusabile
}

/**
 * Re-etichetta una transazione e IMPARA: salva la regola esercente→categoria e
 * applica la stessa categoria a tutte le transazioni dello stesso esercente.
 * Le transazioni future verranno categorizzate automaticamente via la regola.
 */
export async function relabelTransaction(
  store: Store,
  transactionId: number,
  categoryId: number | null,
): Promise<RelabelResult> {
  const all = await store.listTransactions({ limit: 100000 });
  const target = all.find((t) => t.id === transactionId);
  if (!target) throw new Error(`Transazione ${transactionId} non trovata`);

  const key = normalizeMerchant(target.merchant);

  // Impara la regola (solo se c'è un esercente riconoscibile e una categoria).
  let learned = false;
  if (key && categoryId != null) {
    await store.learnMerchantRule(key, categoryId);
    learned = true;
  }

  // Applica a tutte le transazioni dello stesso esercente (o solo questa se senza nome).
  const targets = key ? all.filter((t) => normalizeMerchant(t.merchant) === key) : [target];
  let updatedCount = 0;
  for (const t of targets) {
    if (t.categoryId !== categoryId) {
      await store.setTransactionCategory(t.id, categoryId);
      updatedCount++;
    }
  }
  return { categoryId, merchantKey: key, updatedCount, learned };
}
