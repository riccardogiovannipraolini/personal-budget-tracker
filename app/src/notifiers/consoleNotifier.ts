import type { Notification, Notifier } from './notifier.js';

/** Stampa la notifica su console. Default in sviluppo/test (non invadente). */
export class ConsoleNotifier implements Notifier {
  readonly name = 'console';
  async send(n: Notification): Promise<void> {
    console.log(`[notify] ${n.title} — ${n.body}`);
  }
}
