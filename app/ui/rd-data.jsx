/* global React */
// Data layer del REDESIGN "minimal audace" — seed mock (sostituito a runtime da eb-bridge.jsx
// con i dati REALI dell'API). Helper di formato, icone, buildCategories di fallback.

const fmt = (n, cents) => new Intl.NumberFormat('it-IT', {
  style: 'currency', currency: 'EUR',
  minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0,
}).format(n ?? 0);
const eur = (n) => fmt(n, false);
const eurc = (n) => fmt(n, true);
const statusOf = (ratio) => (ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warn' : 'ok');
const statusLabel = { ok: 'In linea', warn: 'Vicino alla soglia', danger: 'Soglia superata' };

const Ico = {
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  cart: 'M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.78L21 8H6.2M9 20a1 1 0 1 0 .01 0M17 20a1 1 0 1 0 .01 0',
  cup: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM17 9h2.2a2.2 2.2 0 0 1 0 4.4H17M7 3v2M11 3v2',
  bus: 'M5 16V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10M4 16h16M7 16v2M17 16v2M5 11h14M8 19h8',
  repeat: 'M4 9a7 7 0 0 1 12-4l2 2M20 15a7 7 0 0 1-12 4l-2-2M17 3v4h-4M7 21v-4h4',
  bag: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2',
  health: 'M12 21s-7-4.4-9.2-8.6A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.2 6.4C19 16.6 12 21 12 21z',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12c0-.6.1-1.2.2-1.7L2.5 8.9l1.5-2.6 2 .8c.8-.7 1.7-1.2 2.7-1.5L9 3.4h3l.3 2.2c1 .3 1.9.8 2.7 1.5l2-.8 1.5 2.6-1.7 1.4c.2.5.2 1.1.2 1.7s0 1.2-.2 1.7l1.7 1.4-1.5 2.6-2-.8c-.8.7-1.7 1.2-2.7 1.5L12 20.6H9l-.3-2.2c-1-.3-1.9-.8-2.7-1.5l-2 .8-1.5-2.6 1.7-1.4C4.1 13.2 4 12.6 4 12z',
  sync: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  arrowL: 'M15 6l-6 6 6 6',
  arrowR: 'M9 6l6 6-6 6',
  chev: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  dots: 'M12 5h.01M12 12h.01M12 19h.01',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12',
  check: 'M5 12l4 4 10-10',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l8 8-9 9-8-8zM7.5 7.5h.01',
  car: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-5z',
  fuel: 'M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M15 8h2.5A1.5 1.5 0 0 1 19 9.5V16a1.5 1.5 0 0 0 3 0V7l-3-3M7 9h4',
  plane: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  gift: 'M20 11v10H4V11M2 7h20v4H2zM12 7v14M12 7C12 7 11 3 8.5 3A2.5 2.5 0 0 0 6 5.5C6 7 9 7 12 7zM12 7c0 0 1-4 3.5-4A2.5 2.5 0 0 1 18 5.5C18 7 15 7 12 7z',
  film: 'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  bolt: 'M13 2L3 14h7l-1 8 10-12h-7z',
  droplet: 'M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z',
  wallet: 'M3 6a2 2 0 0 1 2-2h12v4M3 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H6a3 3 0 0 1-3-3zM16 13h.01',
  card: 'M2 5h20v14H2zM2 9h20M6 15h5',
  euro: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM16 9a4 4 0 1 0 0 6M7 11h6M7 13.5h5',
  calendar: 'M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 9h16M8 2.5v3M16 2.5v3',
  work: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M3 12h18',
  grad: 'M12 3L1 8l11 5 9-4.1V15M5 11v5c0 1 3 2.5 7 2.5s7-1.5 7-2.5v-5',
  dumbbell: 'M6 6v12M4 8.5v7M18 6v12M20 8.5v7M6 12h12',
  heart: 'M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z',
  plant: 'M12 22v-9M12 13c0-4-3-7-8-7 0 4 3 7 8 7zM12 11c0-3 3-6 8-6 0 3-3 6-8 6z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.6 6.6 20l1-6.1L3.2 9.5l6.1-.9z',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.4-2h7.2L19 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  game: 'M8 8h8a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.3 2.1L13 14h-2l-.7 1.1A3.5 3.5 0 0 1 4 13v-1a4 4 0 0 1 4-4zM7 11v2M6 12h2M15 11h.01M17 13h.01',
  pin: 'M12 21s7-7 7-11a7 7 0 0 0-14 0c0 4 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  // — icone extra usate dalla mappa categorie del backend (eb-bridge nameToIcon) —
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 14h2M19 9h2M19 14h2',
  package: 'M12 2.5l8.5 4.2v10.6L12 21.5 3.5 17.3V6.7zM3.7 7L12 11.2 20.3 7M12 21.5V11.2',
  receipt: 'M6 2h12v20l-2.4-1.6L13.2 22 12 20.4 10.8 22 8.4 20.4 6 22zM9 7h6M9 11h6M9 15h4',
  scissors: 'M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8.6 8.6L21 4M14 12l7 8M8.6 15.4L13 13',
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

// — seed mock (fallback se l'API non risponde; eb-bridge sovrascrive a runtime) —
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

const HISTORY = {
  spesa: [318, 372, 401, 356, 389, 244], risto: [142, 118, 156, 97, 131, 97],
  trasp: [88, 104, 96, 121, 84, 97], abbon: [24, 24, 24, 38, 24, 24],
  shop: [96, 210, 134, 188, 142, 264], casa: [142, 138, 165, 120, 134, 112],
  salute: [44, 18, 62, 30, 51, 38], altro: [20, 0, 35, 10, 0, 0],
};
const MONTHS6 = ['dic', 'gen', 'feb', 'mar', 'apr', 'mag'];

const MONTHS_IN_VIEW = MONTHS6.length;
function buildCategories(thresholds, period = 'month', extraDefs = [], txns = TXNS) {
  const defs = [...CAT_DEFS, ...extraDefs];
  return defs.map((c) => {
    const monthly = thresholds[c.id] ?? c.threshold;
    let spent, threshold;
    if (period === 'year') {
      const hist = HISTORY[c.id] || [];
      spent = hist.reduce((a, b) => a + b, 0);
      threshold = monthly * MONTHS_IN_VIEW;
    } else {
      spent = txns.filter((t) => t.catId === c.id && !t.excluded).reduce((s, t) => s + Math.abs(t.amount), 0);
      threshold = monthly;
    }
    const ratio = threshold ? spent / threshold : 0;
    return { ...c, spent, threshold, monthlyThreshold: monthly, ratio, status: statusOf(ratio), remaining: threshold - spent };
  });
}
const DEFAULT_THRESHOLDS = Object.fromEntries(CAT_DEFS.map((c) => [c.id, c.threshold]));
const PICK_ICONS = [
  'tag', 'cart', 'cup', 'bus', 'car', 'fuel', 'plane', 'bag',
  'home', 'health', 'bell', 'gear', 'repeat', 'card', 'wallet', 'euro',
  'phone', 'wifi', 'bolt', 'droplet', 'film', 'music', 'book', 'calendar',
  'work', 'grad', 'dumbbell', 'plant', 'star', 'camera', 'game', 'pin', 'gift',
];

Object.assign(window, {
  eur, eurc, statusOf, statusLabel, Icon, Ico, CAT_DEFS, TXNS, HISTORY, MONTHS6,
  buildCategories, DEFAULT_THRESHOLDS, PICK_ICONS,
});
