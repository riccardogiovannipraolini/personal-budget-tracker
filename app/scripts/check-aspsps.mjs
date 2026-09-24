// Verifica una tantum: la lista ASPSP italiani di Enable Banking contiene Hype?
// Firma un JWT RS256 con la chiave privata locale e chiama GET /aspsps?country=IT.
// Non stampa né trasmette la chiave. Uso: node scripts/check-aspsps.mjs <APP_ID>
// (oppure con ENABLEBANKING_APP_ID nell'ambiente).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

const APP_ID = process.argv[2] ?? process.env.ENABLEBANKING_APP_ID;
if (!APP_ID) {
  console.error("Manca l'application id: node scripts/check-aspsps.mjs <APP_ID>");
  process.exit(2);
}
const KEY_PATH = resolve(process.cwd(), '.secrets', `${APP_ID}.pem`);
const BASE = 'https://api.enablebanking.com';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeJwt(privateKey) {
  const header = { typ: 'JWT', alg: 'RS256', kid: APP_ID };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 1800 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = b64url(signer.sign(privateKey));
  return `${signingInput}.${signature}`;
}

async function main() {
  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const jwt = makeJwt(privateKey);

  const res = await fetch(`${BASE}/aspsps?country=IT`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const list = data.aspsps ?? [];
  console.log(`ASPSP italiani disponibili: ${list.length}`);

  const hype = list.filter((a) => /hype/i.test(a.name ?? ''));
  if (hype.length) {
    console.log('\n✅ HYPE TROVATA:');
    for (const a of hype) console.log('   ', JSON.stringify(a));
  } else {
    console.log('\n❌ Nessuna voce "Hype" nella lista IT.');
  }

  console.log('\nElenco completo (name — auth/psu types):');
  for (const a of list) {
    console.log(`   • ${a.name}${a.psu_types ? ' [' + a.psu_types.join(',') + ']' : ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
