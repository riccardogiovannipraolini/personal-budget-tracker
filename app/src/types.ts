// Tipi di dominio condivisi dalla pipeline.

/** Una transazione così come arriva da una sorgente (Tink, CSV, mock), prima del salvataggio. */
export interface RawTransaction {
  /** Identificatore stabile dalla sorgente: chiave di deduplica. */
  externalId: string;
  /** Data di registrazione (YYYY-MM-DD). */
  bookedAt: string;
  /** Importo in EUR. Negativo = uscita, positivo = entrata. */
  amount: number;
  merchant?: string;
  description?: string;
  /** Categoria grezza dalla sorgente (es. categoria Tink). */
  rawCategory?: string;
}

/** Transazione persistita, con categoria personale risolta. */
export interface Transaction extends RawTransaction {
  id: number;
  categoryId: number | null;
  /** Esclusa dai conteggi (es. spesa anticipata poi rimborsata). Resta visibile ma non somma. */
  excluded: boolean;
}

export interface Category {
  id: number;
  name: string;
  monthlyThreshold: number;
  icon: string;
}

export interface BudgetPeriod {
  categoryId: number;
  period: string; // 'YYYY-MM'
  spent: number;
  threshold: number;
}

export type ThresholdStatus = 'ok' | 'near' | 'exceeded';

/** Riga della dashboard: stato speso/soglia per una categoria nel periodo. */
export interface CategoryStatus {
  categoryId: number;
  categoryName: string;
  spent: number;
  threshold: number;
  remaining: number; // threshold - spent (può essere negativo)
  ratio: number; // spent / threshold (0 se threshold = 0)
  status: ThresholdStatus;
}

export interface DashboardData {
  period: string;
  totalSpent: number;
  totalThreshold: number;
  totalRemaining: number;
  categories: CategoryStatus[];
}

export interface SyncState {
  lastSync: string | null;
  lastExternalId: string | null;
  /** Fino a quando l'API è considerata in pausa per rate limit (ISO). */
  rateLimitedUntil?: string | null;
}
