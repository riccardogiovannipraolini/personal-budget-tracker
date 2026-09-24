import { config } from '../config.js';
import { MemoryStore } from './memoryStore.js';
import { PgStore } from './pgStore.js';
import type { Store } from './store.js';

export type { Store } from './store.js';

/** Crea lo Store in base alla configurazione (STORE=memory|pg). */
export function createStore(): Store {
  if (config.store === 'pg') return new PgStore(config.databaseUrl);
  return new MemoryStore();
}
