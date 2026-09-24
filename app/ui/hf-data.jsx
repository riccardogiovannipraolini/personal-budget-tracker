/* global React */
// Data layer: real transactions (from app CSV/seed), aggregation, helpers, icons.

// --- formatting ---
const fmt = (n, cents) => new Intl.NumberFormat('it-IT', {
  style: 'currency', currency: 'EUR',
  minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0,
}).format(n ?? 0);
const eur = (n) => fmt(n, false);
const eurc = (n) => fmt(n, true);
const statusOf = (ratio) => (ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warn' : 'ok');
const statusLabel = { ok: 'In linea', warn: 'Vicino alla soglia', danger: 'Soglia superata' };

// --- line icons (feather-ish, simple strokes) ---
const Ico = {
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  cart: 'M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.78L21 8H6.2M9 20a1 1 0 1 0 .01 0M17 20a1 1 0 1 0 .01 0',
  cup: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM17 9h2.2a2.2 2.2 0 0 1 0 4.4H17M7 3v2M11 3v2',
  bus: 'M5 16V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10M4 16h16M7 16v2M17 16v2M5 11h14M8 19h8',
  repeat: 'M4 9a7 7 0 0 1 12-4l2 2M20 15a7 7 0 0 1-12 4l-2-2M17 3v4h-4M7 21v-4h4',
  bag: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2',
  cross: 'M12 5v14M5 12h14',
  health: 'M12 21s-7-4.4-9.2-8.6A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.2 6.4C19 16.6 12 21 12 21z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12c0-.6.1-1.2.2-1.7L2.5 8.9l1.5-2.6 2 .8c.8-.7 1.7-1.2 2.7-1.5L9 3.4h3l.3 2.2c1 .3 1.9.8 2.7 1.5l2-.8 1.5 2.6-1.7 1.4c.2.5.2 1.1.2 1.7s0 1.2-.2 1.7l1.7 1.4-1.5 2.6-2-.8c-.8.7-1.7 1.2-2.7 1.5L12 20.6H9l-.3-2.2c-1-.3-1.9-.8-2.7-1.5l-2 .8-1.5-2.6 1.7-1.4C4.1 13.2 4 12.6 4 12z',
  sync: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  arrowL: 'M15 6l-6 6 6 6',
  arrowR: 'M9 6l6 6-6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  check: 'M20 6L9 17l-5-5',
  wallet: 'M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7l2.5-3.2a1 1 0 0 1 .8-.4H16M17 13h.01',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l8 8-9 9-8-8zM7.5 7.5h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  // icone aggiunte per le categorie del budget
  fuel: 'M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16M4 21h11M14 9h3l2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3M7 8h5',
  game: 'M7 7h10a4 4 0 0 1 4 4v3a3 3 0 0 1-5.5 1.7L14 15H10l-1.5 .7A3 3 0 0 1 3 14v-3a4 4 0 0 1 4-4zM8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01',
  dumbbell: 'M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8M3 11v2M21 11v2',
  car: 'M5 11l1.6-4.3A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.4L19 11M4 11h16v5H4zM7.5 16v2M16.5 16v2M7 11.5h.01M17 11.5h.01',
  package: 'M12 2.5l8.5 4.2v10.6L12 21.5 3.5 17.3V6.7zM3.7 7L12 11.2 20.3 7M12 21.5V11.2',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 14h2M19 9h2M19 14h2',
  scissors: 'M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8.6 8.6L21 4M14 12l7 8M8.6 15.4L13 13',
  receipt: 'M6 2h12v20l-2.4-1.6L13.2 22 12 20.4 10.8 22 8.4 20.4 6 22zM9 7h6M9 11h6M9 15h4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.6 3.3M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.2-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
};
function Icon({ name, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={Ico[name] || Ico.tag} />
    </svg>
  );
}

// --- categories (seed thresholds) ---
const CAT_DEFS = [
  { id: 'spesa', name: 'Spesa alimentare', threshold: 400, icon: 'cart' },
  { id: 'risto', name: 'Ristoranti e bar', threshold: 150, icon: 'cup' },
  { id: 'trasp', name: 'Trasporti', threshold: 120, icon: 'bus' },
  { id: 'abbon', name: 'Abbonamenti', threshold: 50, icon: 'repeat' },
  { id: 'shop', name: 'Shopping', threshold: 200, icon: 'bag' },
  { id: 'casa', name: 'Casa e bollette', threshold: 500, icon: 'home' },
  { id: 'salute', name: 'Salute', threshold: 100, icon: 'health' },
  { id: 'altro', name: 'Altro', threshold: 100, icon: 'tag' },
];

const RAW_TO_CAT = {
  groceries: 'spesa', supermarket: 'spesa', restaurants: 'risto', bars: 'risto', coffee: 'risto',
  transport: 'trasp', fuel: 'trasp', public_transport: 'trasp', subscriptions: 'abbon', streaming: 'abbon',
  shopping: 'shop', clothing: 'shop', utilities: 'casa', rent: 'casa', health: 'salute', pharmacy: 'salute',
};

// --- transactions (May 2026, from sample-data/transactions.csv) ---
const TXN_RAW = [
  ['2026-05-03', -62.40, 'Esselunga', 'Spesa settimanale', 'groceries'],
  ['2026-05-04', -3.20, 'Bar Centrale', 'Cappuccino e brioche', 'coffee'],
  ['2026-05-05', -13.99, 'Netflix', 'Abbonamento mensile', 'streaming'],
  ['2026-05-06', -45.00, 'Q8 Distributore', 'Rifornimento', 'fuel'],
  ['2026-05-08', -28.50, 'Trattoria da Mario', 'Pranzo', 'restaurants'],
  ['2026-05-09', -9.99, 'Spotify', 'Abbonamento mensile', 'subscriptions'],
  ['2026-05-10', -74.20, 'Esselunga', 'Spesa', 'groceries'],
  ['2026-05-11', -2.00, 'ATM Milano', 'Biglietto metro', 'public_transport'],
  ['2026-05-12', -119.90, 'Zara', 'Giacca', 'clothing'],
  ['2026-05-14', -54.30, 'Amazon', 'Articoli vari', 'shopping'],
  ['2026-05-15', -112.00, 'Enel Energia', 'Bolletta luce', 'utilities'],
  ['2026-05-17', -22.80, 'Farmacia Comunale', 'Medicinali', 'pharmacy'],
  ['2026-05-18', -41.10, 'Conad', 'Spesa', 'supermarket'],
  ['2026-05-20', -7.50, 'Bar Centrale', 'Aperitivo', 'coffee'],
  ['2026-05-22', -58.00, 'Trattoria da Mario', 'Cena', 'restaurants'],
  ['2026-05-24', -89.99, 'Amazon', 'Cuffie', 'shopping'],
  ['2026-05-25', -2.20, 'ATM Milano', 'Biglietto metro', 'public_transport'],
  ['2026-05-27', -66.70, 'Esselunga', 'Spesa', 'groceries'],
  ['2026-05-28', -15.00, 'Farmacia Comunale', 'Integratori', 'pharmacy'],
  ['2026-05-29', -48.00, 'Q8 Distributore', 'Rifornimento', 'fuel'],
];
const monthDay = (iso) => {
  const m = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const d = iso.split('-'); return `${+d[2]} ${m[+d[1] - 1]}`;
};
const TXNS = TXN_RAW.map(([date, amount, merchant, desc, raw], i) => ({
  id: i + 1, date, day: monthDay(date), amount, merchant, desc, catId: RAW_TO_CAT[raw] || 'altro',
})).reverse();

// fabricated 6-month history per category (for trend charts), last value = current
const HISTORY = {
  spesa: [318, 372, 401, 356, 389, 244], risto: [142, 118, 156, 97, 131, 97],
  trasp: [88, 104, 96, 121, 84, 97], abbon: [24, 24, 24, 38, 24, 24],
  shop: [96, 210, 134, 188, 142, 264], casa: [142, 138, 165, 120, 134, 112],
  salute: [44, 18, 62, 30, 51, 38], altro: [20, 0, 35, 10, 0, 0],
};
const MONTHS6 = ['dic', 'gen', 'feb', 'mar', 'apr', 'mag'];

// build category list with computed spent/ratio/status.
// period: 'month' (real May transactions) | 'year' (sum of 6-month history).
// extraDefs: user-added categories appended to the seed set.
const MONTHS_IN_VIEW = MONTHS6.length; // 6 months of history available
function buildCategories(thresholds, period = 'month', extraDefs = []) {
  const defs = [...CAT_DEFS, ...extraDefs];
  return defs.map((c) => {
    const monthly = thresholds[c.id] ?? c.threshold;
    let spent, threshold;
    if (period === 'year') {
      const hist = HISTORY[c.id] || [];
      spent = hist.reduce((a, b) => a + b, 0);
      threshold = monthly * MONTHS_IN_VIEW;
    } else {
      spent = TXNS.filter((t) => t.catId === c.id).reduce((s, t) => s + Math.abs(t.amount), 0);
      threshold = monthly;
    }
    const ratio = threshold ? spent / threshold : 0;
    return { ...c, spent, threshold, monthlyThreshold: monthly, ratio, status: statusOf(ratio), remaining: threshold - spent };
  });
}
const DEFAULT_THRESHOLDS = Object.fromEntries(CAT_DEFS.map((c) => [c.id, c.threshold]));

// icons offered when creating a new category
const PICK_ICONS = ['tag', 'cart', 'cup', 'bus', 'repeat', 'bag', 'home', 'health', 'wallet', 'bolt', 'bell', 'gear'];

Object.assign(window, {
  eur, eurc, statusOf, statusLabel, Icon, Ico, CAT_DEFS, TXNS, HISTORY, MONTHS6,
  buildCategories, DEFAULT_THRESHOLDS, PICK_ICONS,
});
