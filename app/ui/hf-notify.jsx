/* global React, Icon, eur, statusLabel */
// Notifiche — variant B: raggruppate per gravità.
const { useState: useStateN } = React;

function buildNotifs(cats) {
  const out = [];
  cats.filter((c) => c.status === 'danger').forEach((c) =>
    out.push({ id: 'd-' + c.id, sev: 'danger', icon: c.icon, title: c.name, catId: c.id,
      msg: `Hai superato la soglia di ${eur(c.threshold)} di ${eur(c.spent - c.threshold)}.`, time: 'oggi, 09:14' }));
  cats.filter((c) => c.status === 'warn').forEach((c) =>
    out.push({ id: 'w-' + c.id, sev: 'warn', icon: c.icon, title: c.name, catId: c.id,
      msg: `Sei al ${Math.round(c.ratio * 100)}% della soglia mensile.`, time: 'ieri, 18:30' }));
  out.push({ id: 'a-sync', sev: 'info', icon: 'sync', title: 'Sincronizzazione', msg: '20 nuove transazioni importate da Hype.', time: '2 giorni fa' });
  out.push({ id: 'a-tg', sev: 'info', icon: 'bell', title: 'Telegram', msg: 'Avvisi di soglia inviati al tuo bot.', time: '2 giorni fa' });
  return out;
}

function NotifCard({ n, read, onToggle, onOpen }) {
  const sevPill = { danger: 'Critico', warn: 'Attenzione', info: 'Info' }[n.sev];
  const clickable = n.catId;
  return (
    <div className="card rise" style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderLeft: `3px solid var(--${n.sev === 'info' ? 'acc' : n.sev})`,
      opacity: read ? 0.5 : 1, transition: 'opacity .3s, transform .2s', cursor: clickable ? 'pointer' : 'default',
    }} onClick={() => clickable && onOpen(n.catId)}>
      <span className={`cico ${n.sev === 'info' ? '' : n.sev === 'warn' ? 'bg-warn c-warn' : 'bg-danger c-danger'}`}
        style={{ borderColor: n.sev === 'info' ? 'var(--line)' : 'transparent' }}><Icon name={n.icon} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{n.title}</div>
        <div className="muted" style={{ fontSize: 13 }}>{n.msg}</div>
      </span>
      <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{n.time}</span>
      <button className="btn ghost" title={read ? 'Segna da leggere' : 'Segna letto'}
        onClick={(e) => { e.stopPropagation(); onToggle(n.id); }} style={{ padding: 7 }}>
        <Icon name="check" style={{ width: 16, height: 16, color: read ? 'var(--acc)' : 'var(--text-3)' }} />
      </button>
    </div>
  );
}

function Notifiche({ cats, onOpen }) {
  const all = buildNotifs(cats);
  const [read, setRead] = useStateN({});
  const [filter, setFilter] = useStateN('all');
  const toggle = (id) => setRead((r) => ({ ...r, [id]: !r[id] }));
  const groups = [
    { key: 'danger', label: 'Critici', items: all.filter((n) => n.sev === 'danger') },
    { key: 'warn', label: 'Attenzione', items: all.filter((n) => n.sev === 'warn') },
    { key: 'info', label: 'Attività', items: all.filter((n) => n.sev === 'info') },
  ].filter((g) => (filter === 'all' ? true : filter === 'alerts' ? g.key !== 'info' : true) && g.items.length);

  return (
    <div className="screen fade" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="seg">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tutti</button>
          <button className={filter === 'alerts' ? 'on' : ''} onClick={() => setFilter('alerts')}>Solo avvisi</button>
        </div>
        <button className="btn" onClick={() => setRead(Object.fromEntries(all.map((n) => [n.id, true])))}>
          <Icon name="check" /> Segna tutti letti
        </button>
      </div>
      <div className="grid" style={{ gap: 26 }}>
        {groups.map((g) => (
          <div key={g.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
              <span className={`dot ${g.key === 'info' ? 'ok' : g.key}`} />
              <span className="eyebrow">{g.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>· {g.items.length}</span>
            </div>
            <div className="grid" style={{ gap: 10 }}>
              {g.items.map((n) => <NotifCard key={n.id} n={n} read={!!read[n.id]} onToggle={toggle} onOpen={onOpen} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Notifiche, buildNotifs });
