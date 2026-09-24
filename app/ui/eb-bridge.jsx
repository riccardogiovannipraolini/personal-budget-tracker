/* global window, statusOf, CAT_DEFS */
// Ponte dati: sostituisce il layer mock (buildCategories / TXNS / HISTORY)
// con i dati REALI letti dalla nostra API (/api/*).
// Gli id UI delle categorie = id numerici del backend; 'senza' = secchiello.
// Aggiornamento IN-PLACE: dopo una modifica ri-scarica i dati e notifica React
// (niente reload della pagina). Deve girare DOPO rd-data.jsx e PRIMA di rd-app.jsx
// (il layer mock del redesign espone gli stessi globali che qui sovrascriviamo).

(function () {
  const IT_MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const monthDay = (iso) => {
    const d = (iso || '').split('-');
    return d.length === 3 ? `${+d[2]} ${IT_MONTHS[+d[1] - 1]}` : iso;
  };

  // Icona per categoria (nomi del budget proposto). Fallback 'tag'.
  const nameToIcon = {
    'Software & AI (abbonamenti)': 'chip',
    'Ristoranti, bar & caffè': 'cup',
    'Carburante': 'fuel',
    'Spesa / Supermercato': 'cart',
    'Trasporti (pedaggi/parcheggi/mezzi)': 'bus',
    'Intrattenimento & Gaming': 'game',
    'Palestra & Integratori': 'dumbbell',
    'Food delivery': 'package',
    'Auto (manutenzione)': 'car',
    'Abbigliamento & Shopping': 'bag',
    'Tasse & Servizi pubblici': 'receipt',
    'Cura personale': 'scissors',
    'Altro / Vario': 'tag',
  };
  const iconForName = (name) => nameToIcon[name] || 'tag';
  const idOf = (categoryId) => (categoryId == null || categoryId === 0 ? 'senza' : String(categoryId));

  // Ultimi 6 mesi (fissi rispetto a oggi).
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: IT_MONTHS[d.getMonth()] });
  }
  const currentKey = months[months.length - 1].key;

  // Stato corrente, ricostruito a ogni refresh.
  let cur = { realMonth: [], TXNS: [], HISTORY: {}, categories: [] };

  function computeFromApi(API) {
    const TXNS = API.txns
      .filter((t) => (t.bookedAt || '').startsWith(currentKey))
      .map((t, i) => ({
        id: t.id ?? i + 1,
        date: t.bookedAt,
        day: monthDay(t.bookedAt),
        amount: t.amount,
        merchant: t.merchant || t.description || '—',
        desc: t.description || t.merchant || '',
        catId: idOf(t.categoryId),
        bcat: t.categoryId != null ? t.categoryId : null,
        excluded: !!t.excluded,
      }))
      .reverse();

    const HISTORY = {};
    for (const t of API.txns) {
      if (t.amount >= 0) continue;
      if (t.excluded) continue; // coerente con la dashboard: le escluse non contano
      const idx = months.findIndex((m) => (t.bookedAt || '').startsWith(m.key));
      if (idx < 0) continue;
      const id = idOf(t.categoryId);
      (HISTORY[id] = HISTORY[id] || months.map(() => 0))[idx] += Math.abs(t.amount);
    }
    for (const id of Object.keys(HISTORY)) HISTORY[id] = HISTORY[id].map((v) => Math.round(v));

    const iconById = {};
    for (const c of API.cats || []) iconById[c.id] = c.icon;

    const realMonth = (API.dash.categories || []).map((c) => ({
      id: idOf(c.categoryId),
      name: c.categoryName,
      icon: iconById[c.categoryId] || iconForName(c.categoryName),
      spent: c.spent,
      monthlyThreshold: c.threshold,
    }));

    return { realMonth, TXNS, HISTORY, categories: (API.cats || []).map((c) => ({ id: c.id, name: c.name, icon: c.icon })) };
  }

  // Pubblica lo stato corrente sulle variabili globali lette dai componenti.
  function publish() {
    window.TXNS = cur.TXNS;
    window.HISTORY = cur.HISTORY;
    window.MONTHS6 = months.map((m) => m.label);
    window.__CATEGORIES = cur.categories;
    const dt = {};
    for (const c of cur.realMonth) dt[c.id] = c.monthlyThreshold;
    window.DEFAULT_THRESHOLDS = dt;
  }

  function buildCategories(thresholds, period = 'month', extraDefs = []) {
    const base = cur.realMonth.map((c) => ({ ...c }));
    for (const d of extraDefs) base.push({ id: d.id, name: d.name, icon: d.icon, spent: 0, monthlyThreshold: d.threshold });
    return base.map((c) => {
      const monthly = thresholds[c.id] ?? c.monthlyThreshold ?? 0;
      let spent, threshold;
      if (period === 'year') {
        spent = (cur.HISTORY[c.id] || []).reduce((a, b) => a + b, 0);
        threshold = monthly * months.length;
      } else {
        spent = c.spent ?? 0;
        threshold = monthly;
      }
      const ratio = threshold ? spent / threshold : 0;
      return { ...c, spent, threshold, monthlyThreshold: monthly, ratio, status: statusOf(ratio), remaining: threshold - spent };
    });
  }

  // --- Refresh in-place: ri-scarica i dati e notifica React ---
  let subscriber = null;
  async function refreshData() {
    const [cats, dash, txns] = await Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/transactions?limit=100000').then((r) => r.json()),
    ]);
    cur = computeFromApi({ cats, dash, txns });
    publish();
    if (subscriber) subscriber(); // fa ri-renderizzare l'App
  }

  // --- Comandi verso l'API (poi refresh in-place, niente reload) ---
  async function apiCall(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  async function relabel(txId, categoryId) {
    try {
      await apiCall('PATCH', `/api/transactions/${txId}/category`, { categoryId: categoryId === '' ? null : Number(categoryId) });
      await refreshData();
    } catch (e) { alert('Re-etichettatura fallita: ' + e.message); }
  }

  async function setExcluded(txId, excluded) {
    try {
      await apiCall('PATCH', `/api/transactions/${txId}/exclude`, { excluded: !!excluded });
      await refreshData();
    } catch (e) { alert('Operazione fallita: ' + e.message); }
  }

  async function deleteTransaction(txId) {
    try {
      await apiCall('DELETE', `/api/transactions/${txId}`);
      await refreshData();
    } catch (e) { alert('Eliminazione fallita: ' + e.message); }
  }

  const thrTimers = {};
  function saveThreshold(id, value) {
    if (id === 'senza') return;
    clearTimeout(thrTimers[id]);
    thrTimers[id] = setTimeout(() => {
      // soglia: salva in background; la UI è già aggiornata localmente, niente refresh.
      apiCall('PATCH', `/api/categories/${id}`, { monthlyThreshold: Number(value) }).catch((e) => console.error('[soglia]', e.message));
    }, 500);
  }

  async function renameCategory(id, name) {
    if (id === 'senza' || !name || !name.trim()) return;
    try { await apiCall('PATCH', `/api/categories/${id}`, { name: name.trim() }); await refreshData(); }
    catch (e) { alert('Rinomina fallita: ' + e.message); }
  }

  async function deleteCategory(id) {
    if (id === 'senza') return;
    try { await apiCall('DELETE', `/api/categories/${id}`); await refreshData(); }
    catch (e) { alert('Eliminazione fallita: ' + e.message); }
  }

  async function createCategory(name, threshold, icon) {
    try { await apiCall('POST', '/api/categories', { name, monthlyThreshold: Number(threshold) || 0, icon }); await refreshData(); }
    catch (e) { alert('Creazione fallita: ' + e.message); }
  }

  async function setCategoryIcon(id, icon) {
    if (id === 'senza' || !icon) return;
    try { await apiCall('PATCH', `/api/categories/${id}`, { icon }); await refreshData(); }
    catch (e) { alert('Cambio icona fallito: ' + e.message); }
  }

  // Inizializza dai dati già scaricati nell'index.html.
  cur = computeFromApi(window.__API || { cats: [], dash: { categories: [] }, txns: [] });
  publish();

  Object.assign(window, {
    buildCategories,
    __onData: (cb) => { subscriber = cb; },
    __refreshData: refreshData,
    __relabel: relabel,
    __setExcluded: setExcluded,
    __deleteTransaction: deleteTransaction,
    __saveThreshold: saveThreshold,
    __renameCategory: renameCategory,
    __deleteCategory: deleteCategory,
    __createCategory: createCategory,
    __setCategoryIcon: setCategoryIcon,
  });
})();
