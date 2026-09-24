import { config } from './config.js';
import type { Store } from './store/index.js';
import type { CategoryStatus, DashboardData, ThresholdStatus } from './types.js';

function statusFor(spent: number, threshold: number): ThresholdStatus {
  if (threshold <= 0) return 'ok';
  if (spent > threshold) return 'exceeded';
  if (spent >= threshold * config.nearThresholdRatio) return 'near';
  return 'ok';
}

/**
 * Calcola lo speso per categoria nel periodo, lo confronta con le soglie e
 * materializza budget_period. Corrisponde a "Aggiorna totale/categoria" +
 * "Spesa categoria > soglia?" del flusso.
 */
export async function buildDashboard(
  store: Store,
  period: string,
): Promise<DashboardData> {
  const categories = await store.listCategories();
  const spentByCat = await store.spentByCategoryForPeriod(period);
  const uncategorized = round2(await store.uncategorizedSpentForPeriod(period));

  const rows: CategoryStatus[] = [];
  for (const cat of categories) {
    const spent = round2(spentByCat.get(cat.id) ?? 0);
    const threshold = cat.monthlyThreshold;
    await store.upsertBudgetPeriod(cat.id, period, spent, threshold);

    rows.push({
      categoryId: cat.id,
      categoryName: cat.name,
      spent,
      threshold,
      remaining: round2(threshold - spent),
      ratio: threshold > 0 ? spent / threshold : 0,
      status: statusFor(spent, threshold),
    });
  }

  // Ordina mettendo prima le situazioni più critiche.
  const severity: Record<ThresholdStatus, number> = { exceeded: 0, near: 1, ok: 2 };
  rows.sort((a, b) => severity[a.status] - severity[b.status] || b.spent - a.spent);

  // Secchiello "Senza categoria": speso reale non ancora classificato.
  // Conta nel totale ma senza soglia, così niente spesa resta nascosta.
  if (uncategorized > 0) {
    rows.push({
      categoryId: 0,
      categoryName: 'Senza categoria',
      spent: uncategorized,
      threshold: 0,
      remaining: 0,
      ratio: 0,
      status: 'ok',
    });
  }

  const totalSpent = round2(rows.reduce((s, r) => s + r.spent, 0));
  const totalThreshold = round2(rows.reduce((s, r) => s + r.threshold, 0));

  return {
    period,
    totalSpent,
    totalThreshold,
    totalRemaining: round2(totalThreshold - totalSpent),
    categories: rows,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
