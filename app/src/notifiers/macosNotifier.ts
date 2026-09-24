import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Notification, Notifier } from './notifier.js';

const execFileAsync = promisify(execFile);

/**
 * Notifiche native macOS via osascript. Nessun dato lascia la macchina.
 * Funziona solo quando l'utente è sul proprio Mac.
 */
export class MacosNotifier implements Notifier {
  readonly name = 'macos';

  async send(n: Notification): Promise<void> {
    const title = sanitize(n.title);
    const body = sanitize(n.body);
    // Passiamo gli argomenti via osascript con variabili posizionali per evitare injection
    // di AppleScript a partire dal contenuto della notifica.
    const script =
      'on run argv\n' +
      '  display notification (item 1 of argv) with title (item 2 of argv)\n' +
      'end run';
    try {
      await execFileAsync('osascript', ['-e', script, body, title]);
    } catch (err) {
      console.error('[notify] notifica macOS fallita:', err);
    }
  }
}

/** Rimuove newline e caratteri di controllo; il resto è sicuro perché passato come argv. */
function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}
