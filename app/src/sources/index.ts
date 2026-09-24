import { config } from '../config.js';
import { CsvSource } from './csvSource.js';
import { MockSource } from './mockSource.js';
import { TinkSource } from './tinkSource.js';
import { EnableBankingSource } from './enableBankingSource.js';
import type { TransactionSource } from './source.js';

export type { TransactionSource } from './source.js';

/** Crea la sorgente in base alla configurazione (SOURCE=mock|csv|tink|enablebanking). */
export function createSource(): TransactionSource {
  switch (config.source) {
    case 'csv':
      return new CsvSource(config.transactionsCsv);
    case 'enablebanking':
      return new EnableBankingSource();
    case 'tink':
      return new TinkSource(config.tink);
    case 'mock':
    default:
      return new MockSource();
  }
}
