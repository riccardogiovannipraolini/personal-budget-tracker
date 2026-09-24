import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { config } from '../config.js';
import { createSession, startAuth } from './client.js';
import { saveSession } from './session.js';

/** Estrae il parametro `code` da un URL di redirect incollato, o accetta il codice grezzo. */
function extractCode(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return code;
  } catch {
    // non è un URL: assumiamo sia già il code
  }
  return trimmed;
}

async function runAuth(): Promise<void> {
  const eb = config.enableBanking;
  if (!eb.applicationId) {
    console.error('Manca ENABLEBANKING_APP_ID in .env.');
    process.exit(1);
  }

  // Consenso valido ~179 giorni (Hype massimo 180).
  const validUntil = new Date(Date.now() + 179 * 24 * 60 * 60 * 1000).toISOString();
  const state = randomUUID();

  console.log(`▶ Avvio consenso ${eb.aspspName} (${eb.aspspCountry})…`);
  const { url } = await startAuth({ validUntil, state });

  console.log('\n1) Apri questo URL nel browser e autorizza il conto:\n');
  console.log('   ' + url + '\n');
  console.log(
    `2) Dopo l'autorizzazione verrai rimandato a ${eb.redirectUrl}?code=...\n` +
      "   (il browser potrebbe non caricare la pagina: va benissimo, serve solo l'URL)\n",
  );

  const rl = createInterface({ input: stdin, output: stdout });
  const pasted = await rl.question("3) Incolla qui l'URL completo di ritorno (o solo il code): ");
  rl.close();

  const code = extractCode(pasted);
  if (!code) {
    console.error('Nessun code trovato. Riprova.');
    process.exit(1);
  }

  console.log('\n▶ Creo la sessione…');
  const session = await createSession(code);
  const accountUids = session.accounts.map((a) => a.uid);

  saveSession({
    sessionId: session.session_id,
    accountUids,
    validUntil: session.access?.valid_until ?? validUntil,
    linkedAt: new Date().toISOString(),
  });

  console.log(`✓ Sessione salvata. Conti collegati: ${accountUids.length}.`);
  console.log('  Ora puoi usare SOURCE=enablebanking (es. npm run run:once).');
}

runAuth().catch((err) => {
  console.error(err);
  process.exit(1);
});
