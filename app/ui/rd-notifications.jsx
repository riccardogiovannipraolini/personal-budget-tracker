/* global React, Icon, eur */
// Notifiche — avvisi di soglia (dinamici dalle categorie) + eventi (sync, import, modifiche).
// Raggruppate per "Oggi" / "Questa settimana". `fresh: true` = non letta di default.

// Eventi seed (storico realistico, maggio 2026).
const NOTIF_EVENTS = [
  { id: 'ev-sync-0530', type: 'info', icon: 'sync', group: 'today', fresh: true,
    title: 'Sincronizzazione completata', body: 'Conto Hype aggiornato · nessuna nuova transazione.', time: 'oggi · 09:12' },
  { id: 'ev-txn-0529', type: 'info', icon: 'cart', group: 'today', fresh: true,
    title: '3 nuove transazioni importate', body: 'Esselunga, Q8 e Farmacia Comunale assegnate alle categorie.', time: 'oggi · 08:55' },
  { id: 'ev-thr-shop', type: 'info', icon: 'gear', group: 'week', fresh: false,
    title: 'Soglia aggiornata', body: 'Shopping · nuova soglia mensile impostata a ' + eur(200) + '.', time: 'mar · 18:40' },
  { id: 'ev-cat-new', type: 'info', icon: 'plus', group: 'week', fresh: false,
    title: 'Nuova categoria creata', body: 'Hai aggiunto “Salute” al tuo budget mensile.', time: 'lun · 11:05' },
];

// Costruisce la lista completa: avvisi di soglia (sempre freschi) + eventi.
function buildNotifs(cats) {
  const order = { danger: 0, warn: 1 };
  const alerts = cats
    .filter((c) => c.status !== 'ok')
    .sort((a, b) => (order[a.status] - order[b.status]) || (b.ratio - a.ratio))
    .map((c) => ({
      id: `cat-${c.id}`,
      catId: c.id,
      type: c.status,
      icon: c.icon,
      group: 'today',
      fresh: true,
      title: c.status === 'danger' ? `${c.name} · soglia superata` : `${c.name} · vicino alla soglia`,
      body: c.status === 'danger'
        ? `Hai speso ${eur(c.spent)} su ${eur(c.threshold)} — ${eur(Math.abs(c.remaining))} oltre il budget.`
        : `Hai speso ${eur(c.spent)} su ${eur(c.threshold)} — restano ${eur(c.remaining)} (${Math.round(c.ratio * 100)}%).`,
      time: 'poco fa',
    }));
  return [...alerts, ...NOTIF_EVENTS];
}

function NotifRow({ n, unread, onOpen }) {
  const clickable = !!n.catId;
  return (
    <button className={`notif-row ${unread ? 'unread' : ''} ${clickable ? '' : 'flat'}`}
      onClick={() => clickable && onOpen(n.catId)}>
      <span className={`notif-ico ${n.type}`}><Icon name={n.icon} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="notif-top">
          <span className="notif-title">{n.title}</span>
          <span className="notif-time">{n.time}</span>
        </span>
        <span className="notif-body">{n.body}</span>
      </span>
      {unread && <span className={`notif-dot ${n.type}`} />}
    </button>
  );
}

const GROUP_LABEL = { today: 'Oggi', week: 'Questa settimana' };

function Notifications({ cats, onOpen, seen }) {
  const notifs = buildNotifs(cats);
  const unreadCount = notifs.filter((n) => !seen.includes(n.id)).length;
  const groups = ['today', 'week'].map((g) => ({ g, items: notifs.filter((n) => n.group === g) })).filter((x) => x.items.length);

  return (
    <div className="screen fade">
      <div className="rise" style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 9 }}>Centro notifiche</div>
        <div className="faint" style={{ fontSize: 13 }}>
          {unreadCount > 0
            ? <>{unreadCount} {unreadCount === 1 ? 'non letta' : 'non lette'} · {notifs.length} in totale</>
            : <>Tutto letto · {notifs.length} {notifs.length === 1 ? 'notifica' : 'notifiche'}</>}
        </div>
      </div>

      {groups.map(({ g, items }, gi) => (
        <div key={g} className="rise" style={{ marginBottom: 26, animationDelay: `${0.05 + gi * 0.05}s` }}>
          <div className="notif-group">{GROUP_LABEL[g]}</div>
          <div className="notif-list">
            {items.map((n) => <NotifRow key={n.id} n={n} unread={!seen.includes(n.id)} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Notifications, buildNotifs });
