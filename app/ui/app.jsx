/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle,
   DashA, DashB, DashC, CatDetailA, CatDetailB, NotifA, NotifB, SettingsA, SettingsB */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#16b87a",
  "surface": "paper",
  "ink": "marker"
}/*EDITMODE-END*/;

const ACCENTS = {
  "#16b87a": "#d6f3e7", // verde
  "#5b7cff": "#dee4ff", // blu
  "#a85bff": "#ecdcff", // viola
  "#ff7a59": "#ffe1d6", // arancio
};

const W = 1040;
const H = 740;

// NB: must return a DCArtboard element directly (not a wrapper component),
// because DCSection only recognises children whose type === DCArtboard.
function board(id, label, Comp, dark) {
  return (
    <DCArtboard id={id} label={label} width={W} height={H}>
      <div className={dark ? 'wf-dark' : ''} style={{ width: '100%', height: '100%' }}>
        <Comp />
      </div>
    </DCArtboard>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const dark = t.surface === 'dark';

  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--wf-accent', t.accent);
    r.style.setProperty('--wf-accent-soft', ACCENTS[t.accent] || '#d6f3e7');
    document.body.classList.toggle('wf-pencil', t.ink === 'pencil');
  }, [t.accent, t.ink]);

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection id="dash" title="Dashboard" subtitle="Panoramica budget — 3 direzioni di layout">
          {board('dash-a', 'A · Classica · KPI in alto', DashA, dark)}
          {board('dash-b', 'B · Residuo protagonista', DashB, dark)}
          {board('dash-c', 'C · Analytics con sidebar', DashC, dark)}
        </DCSection>

        <DCSection id="detail" title="Dettaglio categoria" subtitle="Cosa vedi cliccando una categoria">
          {board('det-a', 'A · Riepilogo + transazioni', CatDetailA, dark)}
          {board('det-b', 'B · Ring + lista affiancata', CatDetailB, dark)}
        </DCSection>

        <DCSection id="notif" title="Notifiche / avvisi" subtitle="Soglie superate e attività">
          {board('not-a', 'A · Feed unico', NotifA, dark)}
          {board('not-b', 'B · Raggruppati per gravità', NotifB, dark)}
        </DCSection>

        <DCSection id="settings" title="Impostazioni soglie & categorie" subtitle="Dove regoli i limiti mensili">
          {board('set-a', 'A · Tabella con slider', SettingsA, dark)}
          {board('set-b', 'B · Card per categoria', SettingsB, dark)}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Stile schizzo" />
        <TweakColor label="Accento" value={t.accent} options={Object.keys(ACCENTS)} onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Superficie" value={t.surface} options={['paper', 'dark']} onChange={(v) => setTweak('surface', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
