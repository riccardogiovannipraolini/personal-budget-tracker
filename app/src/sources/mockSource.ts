import type { RawTransaction } from '../types.js';
import type { TransactionSource } from './source.js';

const MERCHANTS: Array<{ merchant: string; rawCategory: string; min: number; max: number }> = [
  { merchant: 'Esselunga', rawCategory: 'groceries', min: 15, max: 95 },
  { merchant: 'Conad', rawCategory: 'supermarket', min: 10, max: 70 },
  { merchant: 'Bar Centrale', rawCategory: 'coffee', min: 2, max: 12 },
  { merchant: 'Trattoria da Mario', rawCategory: 'restaurants', min: 18, max: 65 },
  { merchant: 'ATM Milano', rawCategory: 'public_transport', min: 2, max: 39 },
  { merchant: 'Q8 Distributore', rawCategory: 'fuel', min: 30, max: 80 },
  { merchant: 'Netflix', rawCategory: 'streaming', min: 13, max: 18 },
  { merchant: 'Spotify', rawCategory: 'subscriptions', min: 10, max: 11 },
  { merchant: 'Zara', rawCategory: 'clothing', min: 25, max: 120 },
  { merchant: 'Amazon', rawCategory: 'shopping', min: 8, max: 90 },
  { merchant: 'Enel Energia', rawCategory: 'utilities', min: 40, max: 130 },
  { merchant: 'Farmacia Comunale', rawCategory: 'pharmacy', min: 6, max: 45 },
];

/** Sorgente di transazioni finte deterministiche, per demo e sviluppo senza banca. */
export class MockSource implements TransactionSource {
  readonly name = 'mock';

  constructor(private readonly count = 40, private readonly seed = 42) {}

  async fetch(): Promise<RawTransaction[]> {
    const rng = mulberry32(this.seed);
    const txs: RawTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < this.count; i++) {
      const m = MERCHANTS[Math.floor(rng() * MERCHANTS.length)]!;
      const amount = -round2(m.min + rng() * (m.max - m.min));
      // distribuisci nei ~45 giorni passati (così copre il mese corrente)
      const daysAgo = Math.floor(rng() * 45);
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      txs.push({
        externalId: `mock-${this.seed}-${i}`,
        bookedAt: d.toISOString().slice(0, 10),
        amount,
        merchant: m.merchant,
        description: m.merchant,
        rawCategory: m.rawCategory,
      });
    }
    return txs;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// PRNG deterministico: stessi dati a ogni run (utile per test e demo riproducibili).
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
