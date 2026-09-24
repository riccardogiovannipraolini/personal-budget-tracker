/* global React, Icon, eur, PICK_ICONS */
// Modal: crea una nuova categoria (nome + soglia mensile + icona).
const { useState: useStateM, useEffect: useEffectM } = React;

function NewCategoryModal({ onClose, onCreate }) {
  const [name, setName] = useStateM('');
  const [threshold, setThreshold] = useStateM('150');
  const [icon, setIcon] = useStateM('tag');

  // Esc to close
  useEffectM(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const valid = name.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onCreate({ name: name.trim(), threshold: Math.max(0, Math.round(Number(threshold) || 0)), icon });
  };

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>Nuova categoria</h2>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div className="field">
          <label>Nome</label>
          <input className="input" autoFocus value={name} placeholder="es. Tempo libero"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>

        <div className="field">
          <label>Soglia mensile</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input className="input" type="text" inputMode="numeric" value={threshold} style={{ width: 120 }}
              onChange={(e) => setThreshold(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            <span className="fig" style={{ fontSize: 18 }}>€ <span className="faint" style={{ fontSize: 13 }}>/ mese</span></span>
          </div>
        </div>

        <div className="field">
          <label>Icona</label>
          <div className="icon-grid">
            {PICK_ICONS.map((ic) => (
              <button key={ic} className={`icon-pick ${icon === ic ? 'on' : ''}`} onClick={() => setIcon(ic)} title={ic}>
                <Icon name={ic} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Annulla</button>
          <button className="btn primary" style={{ flex: 1, justifyContent: 'center', opacity: valid ? 1 : 0.5 }}
            disabled={!valid} onClick={submit}>
            <Icon name="check" /> Crea categoria
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NewCategoryModal });
