// Enable Banking non fornisce una categoria di spesa: la deduciamo dal nome
// dell'esercente / causale. L'output è una "raw_category" che la tabella
// category_mapping converte nella categoria personale.
// Regole di esempio basate su catene e parole chiave comuni in Italia: vanno
// adattate agli esercenti del proprio conto.
// L'ORDINE conta: la prima regola che combacia vince → le più specifiche prima.
// Modifica/estendi liberamente; il sistema impara comunque dalle tue scelte nella UI.

interface Rule {
  pattern: RegExp;
  rawCategory: string;
}

const rules: Rule[] = [
  // Software & AI / abbonamenti digitali
  { pattern: /anthropic|claude|perplexity|openai|chatgpt|notion|figma|apple\.?com|\bapple\b|spotify|netflix|google ?one|icloud|microsoft|adobe|disney|prime video|dazn|youtube|audible|abbonament|subscription/i, rawCategory: 'software' },

  // Carburante
  { pattern: /\beni\b|tamoil|\bq8\b|\bagip\b|\besso\b|benzin|carburant|distributor/i, rawCategory: 'carburante' },

  // Trasporti: pedaggi, parcheggi, mezzi
  { pattern: /autogrill|autostrad|pedagg|parcheggi|parking|\bgtt\b|\batm\b|telepass|\btaxi\b|biglietto|\bmetro\b|trenitalia|\bitalo\b|autobus|\bbus\b/i, rawCategory: 'trasporti' },

  // Spesa / supermercato
  { pattern: /coop|eurospin|supermercat|conad|esselunga|lidl|carrefour|\baldi\b|despar|crai|penny|alimentari/i, rawCategory: 'spesa' },

  // Intrattenimento & gaming
  { pattern: /playstation|\bsteam\b|\bgaming\b|cinema|nintendo|xbox|teatro|concert/i, rawCategory: 'intrattenimento' },

  // Palestra & integratori
  { pattern: /palestra|integrator|\bgym\b|fitness/i, rawCategory: 'palestra' },

  // Food delivery
  { pattern: /glovo|just ?eat|deliveroo|uber ?eats/i, rawCategory: 'delivery' },

  // Auto (manutenzione)
  { pattern: /officina|meccanic|carrozzeria|gommista|\bgomme\b|revisione|tagliando/i, rawCategory: 'auto' },

  // Abbigliamento & shopping
  { pattern: /zalando|\bzara\b|h&m|\bnike\b|adidas|abbigliament|calzature|scarpe|decathlon|\bshopping\b/i, rawCategory: 'abbigliamento' },

  // Tasse & servizi pubblici
  { pattern: /pagopa|\bspid\b|\bf24\b|\bbollo\b|\btari\b|\btasse\b|servizi pubblic/i, rawCategory: 'tasse' },

  // Cura personale
  { pattern: /parrucchier|barbier|estetist|farmaci|parafarm|profum/i, rawCategory: 'cura' },

  // Ristoranti, bar & caffè (generico) — tenere per ultimo
  { pattern: /ristorant|trattoria|pizz|osteria|\bbar\b|caff|mcdonald|mc donald|burger|sushi|tabacch|taverna|brunch|gelat|pasticc|bistro/i, rawCategory: 'ristoranti' },
];

/** Deduce una raw_category dal testo (esercente + causale). undefined se nessuna regola combacia. */
export function guessRawCategory(text: string | undefined): string | undefined {
  if (!text) return undefined;
  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.rawCategory;
  }
  return undefined;
}
