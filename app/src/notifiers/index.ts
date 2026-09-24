import { config } from '../config.js';
import { ConsoleNotifier } from './consoleNotifier.js';
import { MacosNotifier } from './macosNotifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import type { Notifier } from './notifier.js';

export type { Notification, Notifier } from './notifier.js';

/** Crea il notifier in base alla configurazione (NOTIFY=console|macos|telegram|none). */
export function createNotifier(): Notifier {
  switch (config.notifyChannel) {
    case 'macos':
      return new MacosNotifier();
    case 'telegram':
      return new TelegramNotifier();
    case 'none':
      return { name: 'none', async send() {} };
    case 'console':
    default:
      return new ConsoleNotifier();
  }
}
