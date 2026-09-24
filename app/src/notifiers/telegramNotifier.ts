import { config } from '../config.js';
import type { Notification, Notifier } from './notifier.js';

/** Invia la notifica a un bot Telegram. */
export class TelegramNotifier implements Notifier {
  readonly name = 'telegram';

  async send(n: Notification): Promise<void> {
    const { botToken, chatId } = config.telegram;
    if (!botToken || !chatId) {
      console.log(`[notify] (Telegram non configurato) ${n.title} — ${n.body}`);
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `*${n.title}*\n${n.body}`, parse_mode: 'Markdown' }),
      });
      if (!res.ok) console.error('[notify] Telegram errore', res.status, await res.text());
    } catch (err) {
      console.error('[notify] Telegram invio fallito:', err);
    }
  }
}
