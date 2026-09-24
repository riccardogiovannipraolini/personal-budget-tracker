// Dati di partenza (categorie + mapping) usati dal MemoryStore e per il seed iniziale.
// Per Postgres il seed canonico è in db/seed.sql: i due file vanno tenuti allineati.
// Le soglie sono valori d'esempio: si modificano dalla UI o da Notion.

export interface SeedCategory {
  name: string;
  monthlyThreshold: number;
  icon: string;
}

// 13 categorie con budget mensili d'esempio.
export const seedCategories: SeedCategory[] = [
  { name: 'Software & AI (abbonamenti)', monthlyThreshold: 50, icon: 'chip' },
  { name: 'Ristoranti, bar & caffè', monthlyThreshold: 150, icon: 'cup' },
  { name: 'Carburante', monthlyThreshold: 100, icon: 'fuel' },
  { name: 'Spesa / Supermercato', monthlyThreshold: 250, icon: 'cart' },
  { name: 'Trasporti (pedaggi/parcheggi/mezzi)', monthlyThreshold: 60, icon: 'bus' },
  { name: 'Intrattenimento & Gaming', monthlyThreshold: 40, icon: 'game' },
  { name: 'Palestra & Integratori', monthlyThreshold: 40, icon: 'dumbbell' },
  { name: 'Food delivery', monthlyThreshold: 30, icon: 'package' },
  { name: 'Auto (manutenzione)', monthlyThreshold: 50, icon: 'car' },
  { name: 'Abbigliamento & Shopping', monthlyThreshold: 60, icon: 'bag' },
  { name: 'Tasse & Servizi pubblici', monthlyThreshold: 20, icon: 'receipt' },
  { name: 'Cura personale', monthlyThreshold: 30, icon: 'scissors' },
  { name: 'Altro / Vario', monthlyThreshold: 50, icon: 'tag' },
];

/** raw_category (output di guessRawCategory) -> nome categoria personale. */
export const seedMapping: Record<string, string> = {
  software: 'Software & AI (abbonamenti)',
  ristoranti: 'Ristoranti, bar & caffè',
  carburante: 'Carburante',
  spesa: 'Spesa / Supermercato',
  trasporti: 'Trasporti (pedaggi/parcheggi/mezzi)',
  intrattenimento: 'Intrattenimento & Gaming',
  palestra: 'Palestra & Integratori',
  delivery: 'Food delivery',
  auto: 'Auto (manutenzione)',
  abbigliamento: 'Abbigliamento & Shopping',
  tasse: 'Tasse & Servizi pubblici',
  cura: 'Cura personale',
  altro: 'Altro / Vario',
};
