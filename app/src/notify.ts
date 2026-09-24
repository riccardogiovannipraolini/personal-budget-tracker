import { createNotifier, type Notification } from './notifiers/index.js';
import type { CategoryStatus, DashboardData } from './types.js';

const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

/** Costruisce la notifica per una categoria (alert superamento o promemoria residuo). */
export function notificationForCategory(c: CategoryStatus): Notification {
  if (c.status === 'exceeded') {
    const over = c.spent - c.threshold;
    return {
      title: `🔴 ${c.categoryName}: soglia superata`,
      body: `Speso ${eur(c.spent)} su ${eur(c.threshold)} (+${eur(over)} oltre il limite).`,
    };
  }
  if (c.status === 'near') {
    return {
      title: `🟠 ${c.categoryName}: vicino al limite`,
      body: `Speso ${eur(c.spent)} su ${eur(c.threshold)} — restano ${eur(c.remaining)}.`,
    };
  }
  return {
    title: `🟢 ${c.categoryName}`,
    body: `${eur(c.spent)} su ${eur(c.threshold)} — restano ${eur(c.remaining)}.`,
  };
}

/**
 * Invia notifiche per le categorie toccate da nuove transazioni, sul canale
 * configurato (console/macOS/Telegram). Ritorna i testi inviati.
 */
export async function notifyForCategories(
  dashboard: DashboardData,
  touchedCategoryIds: Set<number>,
): Promise<string[]> {
  const toNotify = dashboard.categories.filter(
    (c) => touchedCategoryIds.has(c.categoryId) && (c.status === 'exceeded' || c.status === 'near'),
  );

  const notifier = createNotifier();
  const sent: string[] = [];
  for (const c of toNotify) {
    const n = notificationForCategory(c);
    await notifier.send(n);
    sent.push(`${n.title} — ${n.body}`);
  }
  return sent;
}
