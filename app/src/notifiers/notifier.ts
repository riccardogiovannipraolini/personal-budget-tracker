/** Una notifica pronta da consegnare su un canale. */
export interface Notification {
  title: string;
  body: string;
}

/** Canale di consegna delle notifiche (console, macOS, Telegram, …). */
export interface Notifier {
  readonly name: string;
  send(n: Notification): Promise<void>;
}
