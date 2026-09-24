import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import type { RawTransaction } from '../types.js';
import type { TransactionSource } from './source.js';

/**
 * Legge transazioni da un CSV (es. export dell'estratto conto Hype).
 * Colonne attese (header): external_id, date, amount, merchant, description, category
 * `amount` negativo = uscita.
 */
export class CsvSource implements TransactionSource {
  readonly name = 'csv';

  constructor(private readonly path: string) {}

  async fetch(): Promise<RawTransaction[]> {
    const content = await readFile(this.path, 'utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    return records.map((r, idx) => {
      const externalId = r.external_id || r.id || `csv-${idx}`;
      const rawAmount = (r.amount ?? '').replace(',', '.');
      return {
        externalId,
        bookedAt: normalizeDate(r.date ?? r.booked_at ?? ''),
        amount: Number(rawAmount),
        merchant: r.merchant || undefined,
        description: r.description || r.merchant || undefined,
        rawCategory: r.category || r.raw_category || undefined,
      } satisfies RawTransaction;
    });
  }
}

/** Accetta YYYY-MM-DD o DD/MM/YYYY e normalizza a YYYY-MM-DD. */
function normalizeDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}
