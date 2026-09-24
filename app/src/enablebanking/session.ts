import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { config } from '../config.js';

export interface StoredSession {
  sessionId: string;
  accountUids: string[];
  validUntil: string; // ISO; scaduto = serve ri-autorizzare
  linkedAt: string;
}

function sessionFile(): string {
  return resolve(process.cwd(), config.enableBanking.sessionPath);
}

export function loadSession(): StoredSession | null {
  const file = sessionFile();
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as StoredSession;
}

export function saveSession(session: StoredSession): void {
  const file = sessionFile();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(session, null, 2), { mode: 0o600 });
}

/** true se la sessione esiste ed è ancora valida (con un margine di 1 giorno). */
export function isSessionValid(session: StoredSession | null): session is StoredSession {
  if (!session) return false;
  const expiresAt = new Date(session.validUntil).getTime();
  return expiresAt - Date.now() > 24 * 60 * 60 * 1000;
}
