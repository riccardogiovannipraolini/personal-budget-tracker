// Simula eb-bridge.jsx contro l'API live: verifica che i dati reali producano
// le strutture attese dalla UI (cats, TXNS, HISTORY).
const B='http://localhost:3000';
const [cats,dash,txns]=await Promise.all([
  fetch(B+'/api/categories').then(r=>r.json()),
  fetch(B+'/api/dashboard').then(r=>r.json()),
  fetch(B+'/api/transactions?limit=100000').then(r=>r.json()),
]);
const CAT_DEFS=[['spesa','Spesa alimentare'],['risto','Ristoranti e bar'],['trasp','Trasporti'],['abbon','Abbonamenti'],['shop','Shopping'],['casa','Casa e bollette'],['salute','Salute'],['altro','Altro']];
const nameToUi={}; for(const[id,name]of CAT_DEFS)nameToUi[name]=id; nameToUi['Senza categoria']='senza';
const uiId=n=>nameToUi[n]||'altro';
const statusOf=r=>r>=1?'danger':r>=0.8?'warn':'ok';
const realMonth=(dash.categories||[]).map(c=>{const id=c.categoryId===0?'senza':uiId(c.categoryName);const ratio=c.threshold?c.spent/c.threshold:0;return{id,name:c.categoryName,spent:c.spent,threshold:c.threshold,ratio,status:statusOf(ratio),remaining:c.threshold-c.spent};});
console.log('— CATS (mese corrente) —');
for(const c of realMonth)console.log(`  ${c.id.padEnd(7)} ${c.name.padEnd(18)} speso ${c.spent.toFixed(2)} / ${c.threshold}  [${c.status}]`);
const idToName={}; for(const c of cats)idToName[c.id]=c.name;
const now=new Date(); const months=[];
for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
const cur=months[5];
const TXNS=txns.filter(t=>(t.bookedAt||'').startsWith(cur));
console.log(`\n— TXNS mese corrente (${cur}): ${TXNS.length} —`);
const HISTORY={};
for(const t of txns){if(t.amount>=0)continue;const idx=months.findIndex(m=>(t.bookedAt||'').startsWith(m));if(idx<0)continue;const id=t.categoryId!=null?uiId(idToName[t.categoryId]):'senza';(HISTORY[id]=HISTORY[id]||months.map(()=>0))[idx]+=Math.abs(t.amount);}
console.log('\n— HISTORY (somma uscite per mese) —  mesi:',months.join(' '));
for(const id of Object.keys(HISTORY))console.log(`  ${id.padEnd(7)}`,HISTORY[id].map(v=>Math.round(v)).join('  '));
console.log('\nTotale mese:',realMonth.reduce((s,c)=>s+c.spent,0).toFixed(2),'€  · budget',realMonth.reduce((s,c)=>s+c.threshold,0),'€');
