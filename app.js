/* eLectura · interfaz (React + JSX vía Babel en el navegador) */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const CFG = window.ELECTURA_CONFIG || {};
const APP_VERSION = '1.0.1';

/* ================= Temas y comodidad ================= */
const PALETTE = {
  papel: { bg: '#F4EEDF', fg: '#2B2620', ui: '#E6DDC8', muted: '#62574A', sheet: '#FBF7EE', line: '#CBBFA6', accent: '#9A5B2E', accentInk: '#FBF7EE' },
  sepia: { bg: '#E8DAB9', fg: '#35291D', ui: '#DACAA3', muted: '#5E4B36', sheet: '#F1E6CC', line: '#BFA982', accent: '#8A4E24', accentInk: '#FBF7EE' },
  noche: { bg: '#1D1915', fg: '#D2C5AE', ui: '#2C261F', muted: '#A69780', sheet: '#27211B', line: '#4A4035', accent: '#D9A06B', accentInk: '#1D1915' }
};
const PRESETS = {
  dia: { theme: 'papel', warm: 0, dim: 0 },
  tarde: { theme: 'sepia', warm: 40, dim: 15 },
  noche: { theme: 'noche', warm: 70, dim: 35 }
};
const MODE_INFO = [
  { id: 'auto', label: 'Automático', short: 'Auto', detail: 'Cambia solo según el horario' },
  { id: 'dia', label: 'Día', short: 'Día', detail: 'Papel, calidez neutra, sin atenuar' },
  { id: 'tarde', label: 'Tarde', short: 'Tarde', detail: 'Sepia, cálida, atenuación ligera' },
  { id: 'noche', label: 'Noche', short: 'Noche', detail: 'Noche cálida, muy cálida, atenuación media' }
];
const PERIOD_LABEL = { dia: 'Día', tarde: 'Tarde', noche: 'Noche' };
const MAX_DIM = 0.55; // 100 % de atenuación = 55 % de oscurecimiento → brillo percibido mínimo 45 %
const FONTS = {
  Literata: "'Literata', Georgia, serif",
  Atkinson: "'Atkinson Hyperlegible', 'Work Sans', sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif"
};
const FONT_LABEL = { Literata: 'Literata', Atkinson: 'Atkinson (alta legibilidad)', Georgia: 'Georgia' };
const SPACING = {
  compacto: { lh: 1.45, margin: 16 },
  normal: { lh: 1.65, margin: 24 },
  amplio: { lh: 1.85, margin: 36 }
};
const DEFAULT_SETTINGS = {
  mode: 'auto', schedule: { dia: '07:00', tarde: '18:00', noche: '21:00' }, custom: null,
  fontSize: 19, font: 'Literata', spacing: 'normal', flow: 'paginated',
  wakeLock: true, breakReminder: false, lookup: true, saveWords: true, freeFinished: true
};
const PROFILE_COLORS = ['#9A5B2E', '#2F4A43', '#3B3552', '#5B6B3A', '#6E3B23', '#2F3E4A'];

function toMinutes(hhmm) { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function periodAt(date, sched) {
  const m = date.getHours() * 60 + date.getMinutes();
  const d = toMinutes(sched.dia), t = toMinutes(sched.tarde), n = toMinutes(sched.noche);
  if (m >= n || m < d) return 'noche';
  if (m >= t) return 'tarde';
  return 'dia';
}
function effectiveComfort(settings, now) {
  const period = settings.mode === 'auto' ? periodAt(now, settings.schedule) : settings.mode;
  const base = PRESETS[period];
  const c = settings.custom;
  if (c && c.mode === settings.mode && c.period === period) return { ...base, dim: c.dim, warm: c.warm, period, custom: true };
  return { ...base, period, custom: false };
}
function hashColor(text) {
  let h = 0; for (let i = 0; i < (text || '').length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return PROFILE_COLORS[Math.abs(h) % PROFILE_COLORS.length];
}

/* ================= Íconos (trazo) ================= */
const Icon = ({ d, size = 22, sw = 1.8, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const IBack = () => <Icon d="M15 18l-6-6 6-6" />;
const INext = () => <Icon d="M9 18l6-6-6-6" />;
const IClose = () => <Icon d="M6 6l12 12M18 6L6 18" size={18} sw={2} />;
const ISearch = () => <Icon size={18} sw={2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Icon>;
const ISliders = () => <Icon><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icon>;
const IMore = () => <Icon size={20}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>;
const ICloud = () => <Icon><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z" /></Icon>;
const IFile = () => <Icon size={22} sw={1.6}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></Icon>;
const IWifiOff = () => <Icon><path d="M2 8.8a15 15 0 0 1 4.2-2.6M10 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 5-2.4M16.9 11.4a10 10 0 0 1 2.1 1.1M8.5 16a5 5 0 0 1 7 0M12 20h0M3 3l18 18" /></Icon>;

/* ================= Piezas comunes ================= */
function Toggle({ on, onChange, label }) {
  return (
    <button type="button" className={'toggle' + (on ? ' on' : '')} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}
function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
function TopBar({ title, onBack, right }) {
  return (
    <header className="topbar">
      {onBack ? <button type="button" className="icon-btn" aria-label="Volver" onClick={onBack}><IBack /></button> : <span className="icon-spacer" />}
      <h1 className="topbar-title">{title}</h1>
      {right || <span className="icon-spacer" />}
    </header>
  );
}
function Sheet({ children, onClose, label }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
function useObjectUrl(loader, deps) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true, made = null;
    loader().then(blob => { if (alive && blob) { made = URL.createObjectURL(blob); setUrl(made); } }).catch(() => {});
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, deps);
  return url;
}
function Cover({ book, height = 146 }) {
  const url = useObjectUrl(() => book.hasCover ? Svc.getCover(book.id) : Promise.resolve(null), [book.id, book.hasCover]);
  if (url) return <img className="cover" src={url} alt="" style={{ height }} />;
  if (book.format === 'pdf') return <div className="cover cover-pdf" style={{ height }}><IFile /><span>{book.title}</span></div>;
  return <div className="cover cover-text" style={{ height, background: hashColor(book.title) }}><span>{book.title}</span></div>;
}

/* ================= Perfiles ================= */
function ProfilesScreen({ profiles, currentId, onPick, onCreate, onBack }) {
  const [name, setName] = useState('');
  const first = profiles.length === 0;
  return (
    <div className="screen">
      <TopBar title={first ? 'eLectura' : 'Perfiles'} onBack={first ? null : onBack} />
      <div className="content">
        {first && <p className="lead">Cada persona de la casa tiene su perfil: sus libros, su progreso y su modo de lectura.</p>}
        {!first && (
          <div className="card list">
            {profiles.map(p => (
              <button key={p.id} type="button" className="row row-btn" onClick={() => onPick(p.id)}>
                <span className="avatar" style={{ background: p.color }}>{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="grow">{p.name}</span>
                {p.id === currentId && <span className="muted small">En uso</span>}
              </button>
            ))}
          </div>
        )}
        <div className="card pad stack">
          <label htmlFor="pname" className="field-label">{first ? '¿Quién va a leer?' : 'Nuevo perfil'}</label>
          <input id="pname" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" maxLength={24} />
          <button type="button" className="btn primary" disabled={!name.trim()} onClick={() => { onCreate(name.trim()); setName(''); }}>
            {first ? 'Empezar a leer' : 'Crear perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Biblioteca ================= */
function Library({ profile, books, onOpen, onImportClick, go, onBookAction }) {
  const [filter, setFilter] = useState('todos');
  const [menuFor, setMenuFor] = useState(null);
  const current = books.find(b => b.hasFile && b.openedAt && !b.finished);
  const shown = books.filter(b => filter === 'todos' || b.lang === filter);
  return (
    <div className="screen">
      <header className="lib-head">
        <div>
          <div className="muted small">Biblioteca de</div>
          <h1 className="display">{profile.name}</h1>
        </div>
        <div className="row-inline">
          <button type="button" className="avatar avatar-btn" style={{ background: profile.color }} aria-label="Cambiar de perfil" onClick={() => go('profiles')}>
            {profile.name.slice(0, 1).toUpperCase()}
          </button>
          <button type="button" className="icon-btn" aria-label="Ajustes" onClick={() => go('settings')}><ISliders /></button>
        </div>
      </header>
      <div className="content">
        {current && (
          <button type="button" className="card continue" onClick={() => onOpen(current)}>
            <Cover book={current} height={104} />
            <span className="stack-sm grow left">
              <span className="muted small">Continuar leyendo</span>
              <span className="book-title">{current.title}</span>
              <span className="muted small">{[current.author, current.format.toUpperCase()].filter(Boolean).join(', ')}</span>
              <span className="bar"><span style={{ width: Math.round((current.progress?.percent || 0) * 100) + '%' }} /></span>
            </span>
          </button>
        )}

        <div className="row-between">
          <h2 className="h2">Tus libros</h2>
          <Segmented label="Filtrar por idioma" value={filter} onChange={setFilter}
            options={[{ id: 'todos', label: 'Todos' }, { id: 'es', label: 'Español' }, { id: 'en', label: 'Inglés' }]} />
        </div>

        {books.length === 0 ? (
          <div className="empty">
            <p>Tu biblioteca está vacía. Busca un libro gratuito o abre un EPUB o PDF desde tu celular o tu nube.</p>
          </div>
        ) : (
          <div className="grid3">
            {shown.map(b => (
              <div key={b.id} className="book-cell">
                <button type="button" className="cover-btn" onClick={() => onOpen(b)} aria-label={'Abrir ' + b.title}>
                  <Cover book={b} />
                  {!b.hasFile && <span className="badge"><ICloud /> En tu nube</span>}
                </button>
                <div className="row-between">
                  <span className="muted small ellipsis">{b.finished ? 'Terminado' : b.progress?.percent ? Math.round(b.progress.percent * 100) + ' %' : (b.lang === 'en' ? 'Inglés' : b.lang === 'es' ? 'Español' : b.format.toUpperCase())}</span>
                  <button type="button" className="icon-btn sm" aria-label={'Opciones de ' + b.title} onClick={() => setMenuFor(b)}><IMore /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row-gap">
          <button type="button" className="btn primary grow" onClick={() => go('discover')}><ISearch /> Buscar libros</button>
          <button type="button" className="btn dashed grow" onClick={onImportClick}>
            <span className="stack-xs"><span>+ Abrir archivo</span><span className="tiny">Celular, iCloud o Drive</span></span>
          </button>
        </div>
      </div>

      {menuFor && (
        <Sheet label="Opciones del libro" onClose={() => setMenuFor(null)}>
          <div className="sheet-title">{menuFor.title}</div>
          <div className="stack">
            <button type="button" className="btn" onClick={() => { onBookAction('finish', menuFor); setMenuFor(null); }}>
              {menuFor.finished ? 'Marcar como no terminado' : 'Marcar como terminado'}
            </button>
            {menuFor.hasFile && <button type="button" className="btn" onClick={() => { onBookAction('free', menuFor); setMenuFor(null); }}>Quitar del cel (conserva el progreso)</button>}
            <button type="button" className="btn danger" onClick={() => { if (confirm('¿Eliminar "' + menuFor.title + '" y su progreso?')) { onBookAction('delete', menuFor); setMenuFor(null); } }}>Eliminar por completo</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ================= Panel de comodidad ================= */
function ComfortPanel({ settings, eff, onChange, onClose, isPdf }) {
  const setMode = mode => onChange({ ...settings, mode, custom: null });
  const setCustom = (key, val) => {
    const base = { dim: eff.dim, warm: eff.warm };
    onChange({ ...settings, custom: { ...base, [key]: val, mode: settings.mode, period: eff.period } });
  };
  const perceived = Math.round(100 - eff.dim * MAX_DIM);
  const note = settings.mode === 'auto'
    ? 'Automático, ahora aplica ' + PERIOD_LABEL[eff.period]
    : 'Manual, se queda hasta que lo cambies';
  return (
    <Sheet label="Ajustes de lectura" onClose={onClose}>
      <div className="stack">
        <div className="row-between"><span className="strong">Modo</span><span className="muted small">{note}{eff.custom ? ', ajustado' : ''}</span></div>
        <div className="grid4">
          {MODE_INFO.map(m => {
            const sw = m.id === 'auto' ? null : PALETTE[PRESETS[m.id].theme];
            return (
              <button key={m.id} type="button" aria-pressed={settings.mode === m.id} className={'mode-btn' + (settings.mode === m.id ? ' on' : '')}
                style={sw ? { background: sw.bg, color: sw.fg } : null} onClick={() => setMode(m.id)}>
                {m.short}
              </button>
            );
          })}
        </div>
        <div className="stack-xs">
          <div className="row-between"><label htmlFor="dim" className="strong">Atenuación</label><span className="muted small">Brillo percibido {perceived} %</span></div>
          <input id="dim" type="range" min="0" max="100" value={eff.dim} onChange={e => setCustom('dim', Number(e.target.value))} />
        </div>
        <div className="stack-xs">
          <div className="row-between"><label htmlFor="warm" className="strong">Calidez</label><span className="muted small">{eff.warm < 20 ? 'Neutra' : eff.warm < 60 ? 'Cálida' : 'Muy cálida'}</span></div>
          <input id="warm" type="range" min="0" max="100" value={eff.warm} onChange={e => setCustom('warm', Number(e.target.value))} />
        </div>
        <div className="row-between">
          <div className="row-inline">
            <button type="button" className="sq-btn" aria-label={isPdf ? 'Alejar' : 'Letra más chica'} onClick={() => onChange({ ...settings, fontSize: Math.max(14, settings.fontSize - 1) })}>A−</button>
            <span className="num">{settings.fontSize}</span>
            <button type="button" className="sq-btn big" aria-label={isPdf ? 'Acercar' : 'Letra más grande'} onClick={() => onChange({ ...settings, fontSize: Math.min(30, settings.fontSize + 1) })}>A+</button>
          </div>
          <Segmented label="Forma de avanzar" value={settings.flow} onChange={flow => onChange({ ...settings, flow })}
            options={[{ id: 'paginated', label: 'Páginas' }, { id: 'scrolled', label: 'Scroll' }]} />
        </div>
      </div>
    </Sheet>
  );
}

/* ================= Consulta de palabra ================= */
function LookupSheet({ word, sentence, bookLang, bookTitle, canSave, onSave, onClose }) {
  const [tab, setTab] = useState(null);
  const [meaning, setMeaning] = useState({ state: 'idle' });
  const [trans, setTrans] = useState({ state: 'idle' });
  const [saved, setSaved] = useState(false);
  const from = bookLang === 'es' ? 'es' : 'en';
  const to = from === 'en' ? (CFG.TRANSLATE_TO || 'es-MX') : 'en';

  const loadMeaning = useCallback(() => {
    if (meaning.state === 'ok' || meaning.state === 'loading') return Promise.resolve(meaning.data);
    if (!navigator.onLine) { setMeaning({ state: 'offline' }); return Promise.resolve(null); }
    setMeaning({ state: 'loading' });
    return Svc.define(word).then(d => { setMeaning(d ? { state: 'ok', data: d } : { state: 'none' }); return d; })
      .catch(() => { setMeaning({ state: 'error' }); return null; });
  }, [word, meaning]);
  const loadTrans = useCallback(() => {
    if (trans.state === 'ok' || trans.state === 'loading') return Promise.resolve(trans.data);
    if (!navigator.onLine) { setTrans({ state: 'offline' }); return Promise.resolve(null); }
    setTrans({ state: 'loading' });
    return Svc.translate(word, from, to).then(d => { setTrans({ state: 'ok', data: d }); return d; })
      .catch(() => { setTrans({ state: 'error' }); return null; });
  }, [word, trans, from, to]);

  const open = t => { setTab(t); if (t === 'meaning') loadMeaning(); else loadTrans(); };
  const save = () => {
    Promise.all([loadMeaning(), loadTrans()]).then(([m, t]) => {
      const def = m && m.meanings[0] && m.meanings[0].defs[0] ? m.meanings[0].defs[0].text : '';
      onSave({ id: Svc.uid(), word, translation: t ? t.main : '', definition: def, sentence, bookTitle, lang: from, date: new Date().toISOString() });
      setSaved(true);
    });
  };
  const status = s => {
    if (s.state === 'loading') return <p className="muted">Consultando…</p>;
    if (s.state === 'offline') return <div className="notice"><IWifiOff /><span>Sin conexión. Conéctate a internet para consultar esta palabra; el libro se sigue leyendo sin problema.</span></div>;
    if (s.state === 'error') return <div className="notice"><span>El servicio no respondió. Intenta de nuevo en un momento.</span></div>;
    if (s.state === 'none') return <p className="muted">No encontré esta palabra en el diccionario. Prueba con su forma base (por ejemplo, sin -s o -ed).</p>;
    return null;
  };

  return (
    <Sheet label="Consulta de palabra" onClose={onClose}>
      <div className="row-between">
        <div className="row-inline baseline">
          <span className="lookup-word">{word}</span>
          {meaning.data?.phonetic && <span className="muted">{meaning.data.phonetic}</span>}
        </div>
        <button type="button" className="icon-btn filled" aria-label="Cerrar" onClick={onClose}><IClose /></button>
      </div>
      {!tab ? (
        <div className="row-gap">
          <button type="button" className="btn primary grow" onClick={() => open('meaning')}>Significado</button>
          <button type="button" className="btn primary grow" onClick={() => open('translation')}>Traducción</button>
        </div>
      ) : (
        <div className="stack">
          <Segmented label="Tipo de consulta" value={tab} onChange={open}
            options={[{ id: 'meaning', label: 'Significado' }, { id: 'translation', label: 'Traducción' }]} />
          {tab === 'meaning' && (from !== 'en'
            ? <p className="muted">Los significados están disponibles para libros en inglés. Usa Traducción para esta palabra.</p>
            : status(meaning) || (meaning.data && (
              <div className="stack-sm">
                {meaning.data.meanings.map((m, i) => (
                  <div key={i} className="stack-xs">
                    <span className="muted small">{m.pos}</span>
                    {m.defs.map((d, j) => (
                      <div key={j}>
                        <p className="serif">{d.text}</p>
                        {d.example && <p className="serif muted italic small">“{d.example}”</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )))}
          {tab === 'translation' && (status(trans) || (trans.data && (
            <div className="stack-xs">
              <span className="muted small">{from === 'en' ? 'Inglés a español' : 'Español a inglés'}</span>
              <p className="serif trans-main">{trans.data.main}</p>
              {trans.data.alts.length > 0 && <p className="muted small">También: {trans.data.alts.join(', ')}</p>}
            </div>
          )))}
        </div>
      )}
      {sentence && <p className="serif muted small italic quote">“{sentence}”</p>}
      {canSave && (
        <button type="button" className={'btn ' + (saved ? '' : 'primary')} disabled={saved} onClick={save}>
          {saved ? 'Guardada en mi vocabulario' : '+ Guardar en mi vocabulario'}
        </button>
      )}
      <p className="muted tiny center">Cada consulta usa internet</p>
    </Sheet>
  );
}

function sentenceAround(range, word) {
  try {
    let node = range.startContainer;
    while (node && node.nodeType === 3) node = node.parentNode;
    const text = (node && node.textContent || '').replace(/\s+/g, ' ');
    const idx = text.indexOf(word);
    if (idx < 0) return '';
    const start = Math.max(text.lastIndexOf('.', idx), text.lastIndexOf('!', idx), text.lastIndexOf('?', idx)) + 1;
    const ends = ['.', '!', '?'].map(c => text.indexOf(c, idx + word.length)).filter(i => i >= 0);
    const end = ends.length ? Math.min(...ends) + 1 : text.length;
    const s = text.slice(start, end).trim();
    return s.length > 280 ? s.slice(0, 277) + '…' : s;
  } catch (e) { return ''; }
}

/* ================= Vista EPUB ================= */
function EpubView({ book, blob, settings, eff, onProgress, onLocations, onToggleChrome, onWord, navRef, setLabel }) {
  const hostRef = useRef(null);
  const renditionRef = useRef(null);
  const bookRef = useRef(null);
  const cb = useRef({});
  cb.current = { onProgress, onToggleChrome, onWord, settings };
  const pal = PALETTE[eff.theme];
  const paginated = settings.flow === 'paginated';

  useEffect(() => {
    let destroyed = false;
    const epub = ePub();
    bookRef.current = epub;
    blob.arrayBuffer().then(buf => epub.open(buf)).then(() => {
      if (destroyed) return;
      const rendition = epub.renderTo(hostRef.current, {
        width: '100%', height: '100%', spread: 'none', allowScriptedContent: false,
        flow: paginated ? 'paginated' : 'scrolled-doc', manager: paginated ? 'default' : 'continuous'
      });
      renditionRef.current = rendition;
      rendition.hooks.content.register(contents => {
        const doc = contents.document;
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Atkinson+Hyperlegible:wght@400;700&display=swap';
        doc.head.appendChild(link);
        let x0 = 0, y0 = 0, swiped = false;
        doc.addEventListener('touchstart', e => { x0 = e.changedTouches[0].screenX; y0 = e.changedTouches[0].screenY; swiped = false; }, { passive: true });
        doc.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].screenX - x0, dy = e.changedTouches[0].screenY - y0;
          if (cb.current.settings.flow === 'paginated' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped = true;
            if (dx < 0) rendition.next(); else rendition.prev();
          }
        }, { passive: true });
        doc.addEventListener('click', () => {
          const sel = doc.getSelection();
          if (swiped || (sel && sel.toString().trim())) return;
          cb.current.onToggleChrome();
        });
        doc.addEventListener('keyup', e => { if (e.key === 'ArrowRight') rendition.next(); if (e.key === 'ArrowLeft') rendition.prev(); });
      });
      rendition.on('selected', (cfiRange, contents) => {
        const sel = contents.window.getSelection();
        const raw = sel ? sel.toString().trim() : '';
        const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
        if (!word || /\s/.test(word) || word.length > 40) return;
        const sentence = sel.rangeCount ? sentenceAround(sel.getRangeAt(0), raw) : '';
        cb.current.onWord(word, sentence);
      });
      rendition.on('relocated', loc => {
        const cfi = loc.start.cfi;
        const pct = epub.locations.length() ? epub.locations.percentageFromCfi(cfi) : null;
        cb.current.onProgress({ cfi, percent: pct });
        const chapter = loc.start.href ? (epub.navigation && epub.navigation.get(loc.start.href)) : null;
        setLabel([chapter && chapter.label ? chapter.label.trim() : null, pct != null ? Math.round(pct * 100) + ' %' : null].filter(Boolean).join(', '));
      });
      navRef.current = { next: () => rendition.next(), prev: () => rendition.prev() };
      rendition.themes.default({
        'p, li, span, div, blockquote, dd, dt, td, h1, h2, h3, h4, h5, h6': { 'color': 'inherit !important', 'font-family': 'inherit !important', 'background': 'transparent !important' },
        'p, li, blockquote': { 'line-height': 'inherit !important' },
        'a': { 'color': 'inherit !important' },
        'img, svg': { 'max-width': '100% !important', 'height': 'auto !important' }
      });
      applyTheme(rendition);
      return rendition.display(book.progress && book.progress.cfi ? book.progress.cfi : undefined).then(() => {
        if (book.locations) { epub.locations.load(book.locations); }
        else {
          setTimeout(() => {
            if (destroyed) return;
            epub.locations.generate(1600).then(() => { if (!destroyed) onLocations(epub.locations.save()); }).catch(() => {});
          }, 1500);
        }
      });
    }).catch(err => { console.error(err); setLabel('No se pudo abrir este EPUB'); });
    return () => { destroyed = true; try { epub.destroy(); } catch (e) {} renditionRef.current = null; };
  }, [blob, paginated]);

  const applyTheme = r => {
    if (!r) return;
    const sp = SPACING[settings.spacing];
    r.themes.override('color', pal.fg, true);
    r.themes.override('background', pal.bg, true);
    r.themes.override('font-family', FONTS[settings.font], true);
    r.themes.override('line-height', String(sp.lh), true);
    r.themes.fontSize(settings.fontSize + 'px');
    r.themes.override('padding', '0 ' + (paginated ? 4 : sp.margin) + 'px', false);
  };
  useEffect(() => { applyTheme(renditionRef.current); }, [eff.theme, settings.font, settings.fontSize, settings.spacing]);

  const sp = SPACING[settings.spacing];
  return (
    <div className="epub-wrap" style={{ padding: paginated ? '8px ' + sp.margin + 'px' : '0' }}>
      <div ref={hostRef} className="epub-host" />
      {paginated && <button type="button" className="edge edge-left" aria-label="Página anterior" style={{ width: sp.margin + 8 }} onClick={() => renditionRef.current && renditionRef.current.prev()} />}
      {paginated && <button type="button" className="edge edge-right" aria-label="Página siguiente" style={{ width: sp.margin + 8 }} onClick={() => renditionRef.current && renditionRef.current.next()} />}
    </div>
  );
}

/* ================= Vista PDF ================= */
const PDF_FILTER = {
  papel: 'sepia(0.12)',
  sepia: 'sepia(0.55) brightness(0.96)',
  noche: 'invert(0.9) hue-rotate(180deg) sepia(0.35) brightness(0.95)'
};
function PdfPage({ pdf, num, scale, filter, onVisible }) {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const [ratio, setRatio] = useState(1.3);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const near = new IntersectionObserver(es => { if (es[0].isIntersecting) setShown(true); }, { rootMargin: '800px 0px' });
    const seen = new IntersectionObserver(es => { if (es[0].isIntersecting && onVisible) onVisible(num); }, { threshold: 0.5 });
    near.observe(el); seen.observe(el);
    return () => { near.disconnect(); seen.disconnect(); };
  }, [num]);
  useEffect(() => {
    if (!shown) return;
    let task = null, alive = true;
    pdf.getPage(num).then(page => {
      if (!alive) return;
      const width = ref.current.clientWidth;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const vp = page.getViewport({ scale: (width / base.width) * scale * (window.devicePixelRatio || 1) });
      const c = canvasRef.current;
      c.width = vp.width; c.height = vp.height;
      task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
      return task.promise;
    }).catch(() => {});
    return () => { alive = false; if (task) try { task.cancel(); } catch (e) {} };
  }, [shown, scale, num]);
  return (
    <div ref={ref} className="pdf-page" style={shown ? null : { aspectRatio: '1 / ' + ratio }}>
      <canvas ref={canvasRef} style={{ width: (scale * 100) + '%', filter }} />
    </div>
  );
}
function PdfView({ book, blob, settings, eff, onProgress, onToggleChrome, navRef, setLabel }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(book.progress?.page || 1);
  const scrollRef = useRef(null);
  const paginated = settings.flow === 'paginated';
  const scale = settings.fontSize / 19;
  const filter = PDF_FILTER[eff.theme];

  useEffect(() => {
    let doc = null, alive = true;
    blob.arrayBuffer().then(buf => pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise).then(d => { doc = d; if (alive) setPdf(d); })
      .catch(() => setLabel('No se pudo abrir este PDF'));
    return () => { alive = false; if (doc) doc.destroy(); };
  }, [blob]);

  useEffect(() => {
    if (!pdf) return;
    onProgress({ page, percent: pdf.numPages > 1 ? (page - 1) / (pdf.numPages - 1) : 1 });
    setLabel('Página ' + page + ' de ' + pdf.numPages);
  }, [page, pdf]);

  useEffect(() => {
    navRef.current = {
      next: () => setPage(p => pdf ? Math.min(pdf.numPages, p + 1) : p),
      prev: () => setPage(p => Math.max(1, p - 1))
    };
  }, [pdf]);

  useEffect(() => {
    if (!pdf || paginated || !scrollRef.current) return;
    const el = scrollRef.current.querySelector('[data-page="' + page + '"]');
    if (el) el.scrollIntoView();
  }, [pdf, paginated]);

  if (!pdf) return <div className="center-fill muted">Abriendo PDF…</div>;
  if (paginated) {
    return (
      <div className="pdf-scroll" onClick={onToggleChrome}>
        <PdfPage key={page + ':' + scale} pdf={pdf} num={page} scale={scale} filter={filter} />
        <button type="button" className="edge edge-left" aria-label="Página anterior" onClick={e => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }} />
        <button type="button" className="edge edge-right" aria-label="Página siguiente" onClick={e => { e.stopPropagation(); setPage(p => Math.min(pdf.numPages, p + 1)); }} />
      </div>
    );
  }
  const nums = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  return (
    <div className="pdf-scroll" ref={scrollRef} onClick={onToggleChrome}>
      {nums.map(n => <div key={n} data-page={n}><PdfPage pdf={pdf} num={n} scale={scale} filter={filter} onVisible={setPage} /></div>)}
    </div>
  );
}

/* ================= Lector ================= */
function Reader({ book, settings, eff, onSettings, onExit, onBookUpdate, onSaveWord, toast }) {
  const [blob, setBlob] = useState(null);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState(false);
  const [label, setLabel] = useState('');
  const [lookup, setLookup] = useState(null);
  const navRef = useRef({ next: () => {}, prev: () => {} });
  const metaRef = useRef(book);

  useEffect(() => { Svc.getFile(book.id).then(b => b ? setBlob(b) : toast('No encontré el archivo de este libro.')); }, [book.id]);

  // Mantener pantalla encendida
  useEffect(() => {
    if (!settings.wakeLock || !('wakeLock' in navigator)) return;
    let lock = null;
    const req = () => navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    req();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); if (lock) lock.release().catch(() => {}); };
  }, [settings.wakeLock]);

  // Recordatorio de descanso 20-20-20
  useEffect(() => {
    if (!settings.breakReminder) return;
    const t = setInterval(() => toast('Descanso: mira algo lejano durante 20 segundos.'), 20 * 60 * 1000);
    return () => clearInterval(t);
  }, [settings.breakReminder]);

  const saveTimer = useRef(null);
  const onProgress = p => {
    const finished = metaRef.current.finished || (p.percent != null && p.percent >= 0.995);
    metaRef.current = { ...metaRef.current, progress: { ...metaRef.current.progress, ...p }, openedAt: Date.now(), finished };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onBookUpdate(metaRef.current), 600);
  };
  const onLocations = locs => { metaRef.current = { ...metaRef.current, locations: locs }; onBookUpdate(metaRef.current); };
  const exit = () => { clearTimeout(saveTimer.current); onExit(metaRef.current); };
  const onWord = (word, sentence) => { if (settings.lookup) setLookup({ word, sentence }); };

  const isPdf = book.format === 'pdf';
  const View = isPdf ? PdfView : EpubView;
  return (
    <div className="reader">
      <header className={'reader-top' + (chrome ? '' : ' hidden')}>
        <button type="button" className="icon-btn" aria-label="Volver a la biblioteca" onClick={exit}><IBack /></button>
        <div className="reader-title ellipsis">{book.title}</div>
        <button type="button" className="aa-btn" aria-label="Ajustes de lectura" onClick={() => setPanel(true)}>Aa</button>
      </header>
      <div className="reader-body">
        {blob ? <View book={metaRef.current} blob={blob} settings={settings} eff={eff} onProgress={onProgress} onLocations={onLocations}
          onToggleChrome={() => setChrome(c => !c)} onWord={onWord} navRef={navRef} setLabel={setLabel} />
          : <div className="center-fill muted">Abriendo libro…</div>}
      </div>
      <footer className={'reader-foot' + (chrome ? '' : ' hidden')}>
        {settings.flow === 'paginated' && <button type="button" className="icon-btn" aria-label="Página anterior" onClick={() => navRef.current.prev()}><IBack /></button>}
        <span className="muted small grow center ellipsis">{label}</span>
        {settings.flow === 'paginated' && <button type="button" className="icon-btn" aria-label="Página siguiente" onClick={() => navRef.current.next()}><INext /></button>}
      </footer>
      {panel && <ComfortPanel settings={settings} eff={eff} onChange={onSettings} onClose={() => setPanel(false)} isPdf={isPdf} />}
      {lookup && <LookupSheet word={lookup.word} sentence={lookup.sentence} bookLang={book.lang} bookTitle={book.title}
        canSave={settings.saveWords} onSave={onSaveWord} onClose={() => setLookup(null)} />}
    </div>
  );
}

/* ================= Buscar libros y nube ================= */
function SearchSource({ source, books, onSaveRemote }) {
  const [q, setQ] = useState('');
  const [lang, setLang] = useState('en');
  const [state, setState] = useState({ status: 'idle', results: [] });
  const [busy, setBusy] = useState({});
  const run = () => {
    if (!q.trim() && source.type !== 'opds') return;
    setState({ status: 'loading', results: [] });
    const p = source.type === 'gutendex' ? Svc.searchGutenberg(q, lang)
      : source.type === 'openlibrary' ? Svc.searchOpenLibrary(q, lang)
        : Svc.searchOpds(source, q);
    p.then(results => setState({ status: results.length ? 'ok' : 'empty', results }))
      .catch(() => setState({ status: navigator.onLine ? 'error' : 'offline', results: [] }));
  };
  const titles = useMemo(() => new Set(books.filter(b => b.hasFile).map(b => (b.title || '').toLowerCase())), [books]);
  const save = r => {
    setBusy(b => ({ ...b, [r.key]: true }));
    onSaveRemote(r).finally(() => setBusy(b => ({ ...b, [r.key]: false })));
  };
  const note = source.type === 'openlibrary'
    ? 'Se descargan los libros de dominio público; los de préstamo se leen en su sitio.'
    : source.type === 'opds' ? 'Catálogo OPDS de ' + source.name + '.'
      : 'El EPUB se baja directo a tu cel.';
  return (
    <div className="stack">
      <div className="row-gap">
        <label htmlFor="q" className="sr-only">Buscar título o autor</label>
        <input id="q" type="search" className="input grow" placeholder="Título o autor" value={q} enterKeyHint="search"
          onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') run(); }} />
        {source.type !== 'opds' && (
          <>
            <label htmlFor="lang" className="sr-only">Idioma</label>
            <select id="lang" className="input select" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="en">Inglés</option><option value="es">Español</option>
            </select>
          </>
        )}
      </div>
      <button type="button" className="btn primary" onClick={run}><ISearch /> Buscar</button>
      <p className="muted small">{note}</p>
      {state.status === 'loading' && <p className="muted">Buscando…</p>}
      {state.status === 'empty' && <p className="muted">Sin resultados. Prueba con el apellido del autor o parte del título.</p>}
      {state.status === 'offline' && <div className="notice"><IWifiOff /><span>Sin conexión. Conéctate para buscar libros.</span></div>}
      {state.status === 'error' && <div className="notice"><span>{source.name} no respondió. Intenta de nuevo en un momento.</span></div>}
      {state.results.length > 0 && (
        <div className="card list">
          {state.results.map(r => {
            const have = titles.has((r.title || '').toLowerCase());
            return (
              <div key={r.key} className="row result">
                {r.cover ? <img className="thumb" src={r.cover} alt="" loading="lazy" /> : <span className="thumb" style={{ background: hashColor(r.title) }} />}
                <span className="stack-xs grow">
                  <span className="serif strong">{r.title}</span>
                  <span className="muted small">{[r.author, r.format.toUpperCase()].filter(Boolean).join(', ')}</span>
                </span>
                {r.canDownload ? (
                  <button type="button" className={'btn sm ' + (have ? '' : 'primary')} disabled={have || busy[r.key]} onClick={() => save(r)}>
                    {have ? 'En tu cel' : busy[r.key] ? 'Guardando…' : 'Guardar'}
                  </button>
                ) : (
                  <a className="tiny muted right" href={r.page} target="_blank" rel="noopener">Solo préstamo en el sitio</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CloudPanel({ books, onImportClick, onSaveBlob }) {
  const [cloud, setCloud] = useState('icloud');
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState({});
  const prints = useMemo(() => new Set(books.filter(b => b.hasFile).map(b => b.fingerprint)), [books]);
  const connect = () => {
    setStatus('Conectando…');
    Svc.driveConnect().then(() => Svc.driveList('')).then(f => { setFiles(f); setStatus(''); }).catch(e => setStatus(e.message));
  };
  const search = () => { setStatus('Buscando…'); Svc.driveList(q.trim()).then(f => { setFiles(f); setStatus(''); }).catch(e => setStatus(e.message)); };
  const get = f => {
    setBusy(b => ({ ...b, [f.id]: true }));
    Svc.driveDownload(f).then(blob => onSaveBlob(blob, f.name, { source: 'Google Drive' }))
      .catch(e => setStatus(e.message)).finally(() => setBusy(b => ({ ...b, [f.id]: false })));
  };
  return (
    <div className="stack">
      <Segmented label="Nube" value={cloud} onChange={setCloud} options={[{ id: 'icloud', label: 'iCloud Drive' }, { id: 'gdrive', label: 'Google Drive' }]} />
      {cloud === 'icloud' ? (
        <div className="card pad stack">
          <p>Se abre el selector de Archivos del iPhone, con su buscador. Eliges el libro y se baja a tu cel; el original se queda en iCloud.</p>
          <p className="muted small">Si tienes ese libro en pausa, retomas en la página donde ibas.</p>
          <button type="button" className="btn primary" onClick={onImportClick}>Buscar en iCloud Drive</button>
        </div>
      ) : !Svc.driveConfigured() ? (
        <div className="card pad stack">
          <p>Google Drive todavía no está configurado en esta copia de la app.</p>
          <p className="muted small">Pega tu Client ID de Google en <code>config.js</code> siguiendo el paso 5 de la guía personal, y crea una carpeta llamada "{CFG.DRIVE_FOLDER || 'Libros'}" en tu Drive.</p>
        </div>
      ) : files === null ? (
        <div className="card pad stack">
          <p>Conecta tu cuenta para ver tu carpeta "{CFG.DRIVE_FOLDER || 'Libros'}". La app solo puede leer tus archivos, nunca modificarlos.</p>
          <button type="button" className="btn primary" onClick={connect}>Conectar Google Drive</button>
          {status && <p className="muted small">{status}</p>}
        </div>
      ) : (
        <div className="stack">
          <div className="row-gap">
            <label htmlFor="gq" className="sr-only">Buscar en mi carpeta</label>
            <input id="gq" type="search" className="input grow" placeholder={'Buscar en mi carpeta ' + (CFG.DRIVE_FOLDER || 'Libros')} value={q}
              onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }} />
            <button type="button" className="btn primary" onClick={search} aria-label="Buscar"><ISearch /></button>
          </div>
          {status && <p className="muted small">{status}</p>}
          {files.length === 0 && !status && <p className="muted">No hay EPUB ni PDF en esa carpeta.</p>}
          {files.length > 0 && (
            <div className="card list">
              {files.map(f => {
                const have = prints.has(Svc.fingerprintOf(f.name, Number(f.size)));
                return (
                  <div key={f.id} className="row result">
                    <span className="stack-xs grow"><span className="strong">{f.name}</span><span className="muted small">{f.size ? Svc.mb(Number(f.size)) : ''}</span></span>
                    <button type="button" className={'btn sm ' + (have ? '' : 'primary')} disabled={have || busy[f.id]} onClick={() => get(f)}>
                      {have ? 'En tu cel' : busy[f.id] ? 'Bajando…' : 'Bajar al cel'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddSource({ onAdd }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('link');
  const [err, setErr] = useState('');
  const add = () => {
    try { const u = new URL(url.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch (e) { setErr('Escribe una dirección completa, que empiece con https://'); return; }
    onAdd({ id: Svc.uid(), name: name.trim() || new URL(url.trim()).hostname, url: url.trim(), type });
    setName(''); setUrl(''); setErr('');
  };
  return (
    <div className="card pad stack">
      <div className="strong">Nueva fuente</div>
      <label htmlFor="sname" className="field-label">Nombre</label>
      <input id="sname" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del sitio" />
      <label htmlFor="surl" className="field-label">Dirección</label>
      <input id="surl" className="input" type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
      <span className="field-label">Tipo</span>
      <Segmented label="Tipo de fuente" value={type} onChange={setType} options={[{ id: 'link', label: 'Enlace' }, { id: 'opds', label: 'Catálogo OPDS' }]} />
      <p className="muted small">{type === 'opds'
        ? 'Si el sitio publica un catálogo OPDS, podrás buscar y guardar desde aquí.'
        : 'Se abre el sitio en el navegador; descargas el archivo y lo guardas con Abrir archivo.'}</p>
      {err && <p className="error small">{err}</p>}
      <button type="button" className="btn primary" disabled={!url.trim()} onClick={add}>Guardar fuente</button>
    </div>
  );
}

function Discover({ sources, books, onBack, onSaveRemote, onSaveBlob, onImportClick, onAddSource, onRemoveSource, initialTab }) {
  const [tab, setTab] = useState(initialTab || sources[0].id);
  const src = sources.find(s => s.id === tab);
  const tabs = [...sources.map(s => ({ id: s.id, label: s.name })), { id: 'cloud', label: 'Mi nube' }, { id: 'add', label: '+ Agregar fuente' }];
  return (
    <div className="screen">
      <TopBar title="Buscar libros" onBack={onBack} />
      <div className="content">
        <div className="chips" role="tablist">
          {tabs.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={'chip' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {tab === 'cloud' && <CloudPanel books={books} onImportClick={onImportClick} onSaveBlob={onSaveBlob} />}
        {tab === 'add' && <AddSource onAdd={s => { onAddSource(s); setTab(s.id); }} />}
        {src && src.type === 'link' && (
          <div className="card pad stack">
            <div className="serif strong big">{src.name}</div>
            <p>Esta fuente se abre en el navegador: descarga el EPUB y regresa a <strong>Abrir archivo</strong> para guardarlo.</p>
            <a className="btn primary" href={src.url} target="_blank" rel="noopener">Abrir en el navegador</a>
            {!src.builtIn && <button type="button" className="btn danger" onClick={() => { onRemoveSource(src.id); setTab(sources[0].id); }}>Quitar esta fuente</button>}
          </div>
        )}
        {src && src.type !== 'link' && (
          <>
            <SearchSource key={src.id} source={src} books={books} onSaveRemote={onSaveRemote} />
            {!src.builtIn && <button type="button" className="btn danger" onClick={() => { onRemoveSource(src.id); setTab(sources[0].id); }}>Quitar esta fuente</button>}
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Vocabulario ================= */
function Vocab({ words, onDelete, onBack }) {
  return (
    <div className="screen">
      <TopBar title="Mi vocabulario" onBack={onBack} />
      <div className="content">
        {words.length === 0 ? (
          <div className="empty"><p>Aún no guardas palabras. Mientras lees en inglés, mantén presionada una palabra y toca "Guardar en mi vocabulario".</p></div>
        ) : (
          <div className="card list">
            {words.map(w => (
              <div key={w.id} className="row vocab-row">
                <span className="stack-xs grow">
                  <span className="row-inline baseline"><span className="serif strong big">{w.word}</span>{w.translation && <span className="muted">{w.translation}</span>}</span>
                  {w.definition && <span className="small">{w.definition}</span>}
                  {w.sentence && <span className="serif muted small italic">“{w.sentence}”</span>}
                  <span className="tiny muted">{w.bookTitle}</span>
                </span>
                <button type="button" className="icon-btn sm" aria-label={'Borrar ' + w.word} onClick={() => onDelete(w.id)}><IClose /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Ajustes ================= */
function Settings({ settings, onChange, profile, profiles, sources, go, onBack, onExport, onImportBackup, onDeleteProfile, vocabCount, books }) {
  const [storage, setStorage] = useState(null);
  const restoreRef = useRef(null);
  useEffect(() => { Svc.storageInfo().then(setStorage); }, [books.length]);
  const set = patch => onChange({ ...settings, ...patch });
  const setSched = (k, v) => set({ schedule: { ...settings.schedule, [k]: v }, custom: null });
  const mine = books.filter(b => b.hasFile).reduce((a, b) => a + (b.size || 0), 0);
  return (
    <div className="screen">
      <TopBar title="Ajustes" onBack={onBack} />
      <div className="content">
        <h2 className="section">Comodidad visual</h2>
        <div className="card list">
          {MODE_INFO.map(m => {
            const sw = m.id === 'auto' ? PALETTE.papel.ui : PALETTE[PRESETS[m.id].theme].bg;
            return (
              <button key={m.id} type="button" className={'row row-btn' + (settings.mode === m.id ? ' selected' : '')} aria-pressed={settings.mode === m.id}
                onClick={() => set({ mode: m.id, custom: null })}>
                <span className="swatch" style={{ background: sw }} />
                <span className="stack-xs grow left"><span className="strong">{m.label}</span><span className="muted small">{m.detail}</span></span>
                <span className={'radio' + (settings.mode === m.id ? ' on' : '')} />
              </button>
            );
          })}
          <p className="muted small row-note">{settings.mode === 'auto' ? 'Se aplica al instante y cambia solo al llegar cada horario.' : 'Se aplica al instante y se queda fijo hasta que elijas otro modo.'}</p>
        </div>
        <div className="card list">
          {['dia', 'tarde', 'noche'].map(k => (
            <div key={k} className="row">
              <label htmlFor={'h-' + k} className="grow">Empieza {PERIOD_LABEL[k]}</label>
              <input id={'h-' + k} type="time" className="input time" value={settings.schedule[k]} onChange={e => setSched(k, e.target.value)} />
            </div>
          ))}
          <div className="row"><span className="grow">Atenuación máxima</span><span className="muted small">brillo mínimo 45 %</span></div>
        </div>

        <h2 className="section">Lectura</h2>
        <div className="card list">
          <div className="row">
            <label htmlFor="font" className="grow">Tipografía</label>
            <select id="font" className="input select" value={settings.font} onChange={e => set({ font: e.target.value })}>
              {Object.keys(FONTS).map(f => <option key={f} value={f}>{FONT_LABEL[f]}</option>)}
            </select>
          </div>
          <div className="row">
            <span className="grow">Tamaño de letra</span>
            <button type="button" className="sq-btn" aria-label="Letra más chica" onClick={() => set({ fontSize: Math.max(14, settings.fontSize - 1) })}>A−</button>
            <span className="num">{settings.fontSize}</span>
            <button type="button" className="sq-btn big" aria-label="Letra más grande" onClick={() => set({ fontSize: Math.min(30, settings.fontSize + 1) })}>A+</button>
          </div>
          <div className="row col">
            <span>Interlineado y márgenes</span>
            <Segmented label="Interlineado" value={settings.spacing} onChange={spacing => set({ spacing })}
              options={[{ id: 'compacto', label: 'Compacto' }, { id: 'normal', label: 'Normal' }, { id: 'amplio', label: 'Amplio' }]} />
          </div>
          <div className="row col">
            <span>Pasar página</span>
            <Segmented label="Forma de avanzar" value={settings.flow} onChange={flow => set({ flow })}
              options={[{ id: 'paginated', label: 'Páginas' }, { id: 'scrolled', label: 'Scroll' }]} />
          </div>
          <div className="row"><span className="stack-xs grow"><span>Mantener pantalla encendida</span><span className="muted small">Mientras el lector esté abierto</span></span><Toggle on={settings.wakeLock} label="Mantener pantalla encendida" onChange={v => set({ wakeLock: v })} /></div>
          <div className="row"><span className="stack-xs grow"><span>Recordatorio de descanso</span><span className="muted small">Cada 20 min: mira algo lejano 20 s</span></span><Toggle on={settings.breakReminder} label="Recordatorio de descanso" onChange={v => set({ breakReminder: v })} /></div>
        </div>

        <h2 className="section">Diccionario y traducción</h2>
        <div className="card list">
          <div className="row"><span className="stack-xs grow"><span>Consultar al seleccionar palabra</span><span className="muted small">Libros EPUB; mantén presionada la palabra</span></span><Toggle on={settings.lookup} label="Consultar al seleccionar palabra" onChange={v => set({ lookup: v })} /></div>
          <div className="row"><span className="grow">Traducir a</span><span className="muted small">Español (México)</span></div>
          <div className="row"><span className="stack-xs grow"><span>Guardar palabras consultadas</span><span className="muted small">Con la frase donde aparecieron</span></span><Toggle on={settings.saveWords} label="Guardar palabras consultadas" onChange={v => set({ saveWords: v })} /></div>
          <button type="button" className="row row-btn" onClick={() => go('vocab')}><span className="grow left">Mi vocabulario</span><span className="link">{vocabCount} {vocabCount === 1 ? 'palabra' : 'palabras'}</span></button>
        </div>

        <h2 className="section">Fuentes de libros</h2>
        <div className="card list">
          {sources.map(s => (
            <div key={s.id} className="row">
              <span className="stack-xs grow"><span>{s.name}</span><span className="muted small">{s.type === 'link' ? 'Enlace al navegador' : s.type === 'openlibrary' ? 'Búsqueda en la app, dominio público' : 'Búsqueda en la app'}</span></span>
              <span className="muted small">{s.builtIn ? 'Predeterminada' : 'Tuya'}</span>
            </div>
          ))}
          <button type="button" className="row row-btn" onClick={() => go('discover', 'add')}><span className="link">+ Agregar fuente</span></button>
        </div>

        <h2 className="section">Almacenamiento</h2>
        <div className="card pad stack">
          <div className="row-between"><span>Libros de {profile.name} en este dispositivo</span><span className="muted small">{Svc.mb(mine)}</span></div>
          {storage && storage.quota > 0 && (
            <>
              <span className="bar"><span style={{ width: Math.max(2, Math.min(100, storage.usage / storage.quota * 100)) + '%' }} /></span>
              <span className="muted small">La app usa {Svc.mb(storage.usage)} en total. {storage.persisted ? 'El sistema no borrará tus libros por inactividad.' : 'Instala la app en tu pantalla de inicio para que el sistema no borre tus libros.'}</span>
            </>
          )}
          <div className="notice"><ICloud /><span>Tu colección completa vive en tu nube. Aquí solo quedan los libros que estás leyendo; búscalos y bájalos desde Buscar libros, pestaña Mi nube.</span></div>
          <div className="row-between"><span className="stack-xs"><span>Liberar libros terminados</span><span className="muted small">Quita el archivo, conserva progreso y vocabulario</span></span><Toggle on={settings.freeFinished} label="Liberar libros terminados" onChange={v => set({ freeFinished: v })} /></div>
          <div className="row-gap">
            <button type="button" className="btn grow" onClick={onExport}>Respaldar progreso</button>
            <button type="button" className="btn grow" onClick={() => restoreRef.current.click()}>Restaurar respaldo</button>
            <input ref={restoreRef} type="file" hidden accept="application/json,.json" onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onImportBackup(f); }} />
          </div>
        </div>

        <h2 className="section">Perfiles</h2>
        <div className="card pad stack">
          <p className="muted small">Cada perfil tiene sus libros, progreso, modo de comodidad y vocabulario.</p>
          <div className="row-inline wrap">
            {profiles.map(p => <span key={p.id} className="avatar" style={{ background: p.color, outline: p.id === profile.id ? '2px solid var(--fg)' : 'none' }} title={p.name}>{p.name.slice(0, 1).toUpperCase()}</span>)}
            <button type="button" className="avatar dashed-avatar" aria-label="Agregar o cambiar perfil" onClick={() => go('profiles')}>+</button>
          </div>
          {profiles.length > 1 && <button type="button" className="btn danger" onClick={() => { if (confirm('¿Eliminar el perfil de ' + profile.name + ' con sus libros y progreso en este dispositivo?')) onDeleteProfile(profile.id); }}>Eliminar el perfil de {profile.name}</button>}
        </div>
        <p className="muted tiny center">eLectura {APP_VERSION}</p>
      </div>
    </div>
  );
}

/* ================= App ================= */
function App() {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [pid, setPid] = useState(null);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [books, setBooks] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [customSources, setCustomSources] = useState([]);
  const [view, setView] = useState({ name: 'library' });
  const [readerBook, setReaderBook] = useState(null);
  const [now, setNow] = useState(new Date());
  const [toastMsg, setToastMsg] = useState(null);
  const [cloudPrompt, setCloudPrompt] = useState(null);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  const toast = useCallback(msg => {
    setToastMsg(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 4200);
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    Promise.all([Svc.kv.get('profiles', []), Svc.kv.get('currentProfile', null)]).then(([ps, cur]) => {
      setProfiles(ps);
      const id = ps.find(p => p.id === cur) ? cur : (ps[0] && ps[0].id);
      if (id) setPid(id); else setView({ name: 'profiles' });
      setReady(true);
    });
    Svc.requestPersist();
  }, []);

  const refreshBooks = useCallback(() => pid ? Svc.listBooks(pid).then(setBooks) : Promise.resolve(), [pid]);
  useEffect(() => {
    if (!pid) return;
    Svc.kv.set('currentProfile', pid);
    Svc.kv.get('settings:' + pid, null).then(s => setSettingsState({ ...DEFAULT_SETTINGS, ...(s || {}), schedule: { ...DEFAULT_SETTINGS.schedule, ...((s && s.schedule) || {}) } }));
    Svc.kv.get('vocab:' + pid, []).then(setVocab);
    Svc.kv.get('sources:' + pid, []).then(setCustomSources);
    refreshBooks();
  }, [pid]);

  const setSettings = s => { setSettingsState(s); if (pid) Svc.kv.set('settings:' + pid, s); };
  const eff = effectiveComfort(settings, now);
  const pal = PALETTE[eff.theme];
  const profile = profiles.find(p => p.id === pid);
  const sources = [...Svc.DEFAULT_SOURCES, ...customSources];

  useEffect(() => {
    const r = document.documentElement.style;
    Object.entries(pal).forEach(([k, v]) => r.setProperty('--' + k, v));
    document.documentElement.dataset.theme = eff.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', pal.bg);
  }, [eff.theme]);

  const go = (name, tab) => setView({ name, tab });

  const createProfile = name => {
    const p = { id: Svc.uid(), name, color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length] };
    const next = [...profiles, p];
    setProfiles(next); Svc.kv.set('profiles', next); setPid(p.id); go('library');
  };
  const deleteProfile = id => {
    const next = profiles.filter(p => p.id !== id);
    Svc.listBooks(id).then(bs => Promise.all(bs.map(Svc.deleteBook))).then(() => {
      setProfiles(next); Svc.kv.set('profiles', next); setPid(next[0].id); go('library'); toast('Perfil eliminado.');
    });
  };

  const saveBlob = (blob, name, hint) => Svc.saveBookFromBlob(blob, name, pid, hint)
    .then(({ meta, reattached }) => { refreshBooks(); toast(reattached ? 'Retomas "' + meta.title + '" donde ibas.' : 'Guardado: ' + meta.title); return meta; })
    .catch(e => { toast(e.message || 'No se pudo guardar el archivo.'); });

  const onFiles = list => {
    const files = Array.from(list || []);
    files.reduce((p, f) => p.then(() => saveBlob(f, f.name, { source: 'archivo' })), Promise.resolve());
  };

  const saveRemote = r => Svc.downloadBlob(r.download)
    .then(blob => saveBlob(blob, r.title + '.' + r.format, { title: r.title, author: r.author, lang: r.lang, source: r.page }))
    .catch(() => {
      toast('Este sitio no permite descargar desde la app. Te abro la página para bajarlo y luego usa Abrir archivo.');
      window.open(r.page, '_blank', 'noopener');
    });

  const openBook = b => {
    if (!b.hasFile) { setCloudPrompt(b); return; }
    const meta = { ...b, openedAt: Date.now() };
    Svc.updateBook(meta); setReaderBook(meta); go('reader');
  };
  const exitReader = meta => {
    Svc.updateBook(meta).then(() => {
      if (meta.finished && settings.freeFinished && meta.hasFile) {
        return Svc.freeBook(meta).then(() => toast('Terminaste "' + meta.title + '". Quité el archivo del cel; tu progreso y vocabulario se quedan.'));
      }
    }).then(refreshBooks);
    setReaderBook(null); go('library');
  };
  const bookAction = (action, b) => {
    const done = () => refreshBooks();
    if (action === 'finish') Svc.updateBook({ ...b, finished: !b.finished }).then(done);
    if (action === 'free') Svc.freeBook(b).then(() => { toast('Quitado del cel. Bájalo de tu nube cuando quieras seguir.'); done(); });
    if (action === 'delete') Svc.deleteBook(b).then(() => { toast('Libro eliminado.'); done(); });
  };

  const saveWord = w => {
    const next = [w, ...vocab.filter(x => x.word.toLowerCase() !== w.word.toLowerCase())];
    setVocab(next); Svc.kv.set('vocab:' + pid, next);
  };
  const deleteWord = id => { const next = vocab.filter(w => w.id !== id); setVocab(next); Svc.kv.set('vocab:' + pid, next); };
  const addSource = s => { const next = [...customSources, s]; setCustomSources(next); Svc.kv.set('sources:' + pid, next); toast('Fuente agregada: ' + s.name); };
  const removeSource = id => { const next = customSources.filter(s => s.id !== id); setCustomSources(next); Svc.kv.set('sources:' + pid, next); };

  const exportBackup = () => Svc.exportBackup().then(data => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'electura-respaldo-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Respaldo listo. Guárdalo en tu nube.');
  });
  const importBackup = file => file.text().then(t => Svc.importBackup(JSON.parse(t)))
    .then(() => { toast('Respaldo restaurado. Reabriendo…'); setTimeout(() => location.reload(), 1200); })
    .catch(e => toast(e.message || 'No se pudo leer el respaldo.'));

  if (!ready) return <div className="center-fill muted">Cargando…</div>;

  let screen = null;
  if (view.name === 'profiles' || !profile) {
    screen = <ProfilesScreen profiles={profiles} currentId={pid} onPick={id => { setPid(id); go('library'); }} onCreate={createProfile} onBack={() => go('library')} />;
  } else if (view.name === 'reader' && readerBook) {
    screen = <Reader book={readerBook} settings={settings} eff={eff} onSettings={setSettings} onExit={exitReader}
      onBookUpdate={m => Svc.updateBook(m)} onSaveWord={saveWord} toast={toast} />;
  } else if (view.name === 'discover') {
    screen = <Discover sources={sources} books={books} initialTab={view.tab} onBack={() => go('library')} onSaveRemote={saveRemote} onSaveBlob={saveBlob}
      onImportClick={() => fileRef.current.click()} onAddSource={addSource} onRemoveSource={removeSource} />;
  } else if (view.name === 'settings') {
    screen = <Settings settings={settings} onChange={setSettings} profile={profile} profiles={profiles} sources={sources} go={go}
      onBack={() => go('library')} onExport={exportBackup} onImportBackup={importBackup} onDeleteProfile={deleteProfile} vocabCount={vocab.length} books={books} />;
  } else if (view.name === 'vocab') {
    screen = <Vocab words={vocab} onDelete={deleteWord} onBack={() => go('settings')} />;
  } else {
    screen = <Library profile={profile} books={books} onOpen={openBook} onImportClick={() => fileRef.current.click()} go={go} onBookAction={bookAction} />;
  }

  return (
    <>
      {screen}
      <input ref={fileRef} type="file" multiple hidden onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
      {cloudPrompt && (
        <Sheet label="Libro en tu nube" onClose={() => setCloudPrompt(null)}>
          <div className="sheet-title">{cloudPrompt.title}</div>
          <p>Este libro está en tu nube. Bájalo de nuevo y retomas en la página donde ibas.</p>
          <button type="button" className="btn primary" onClick={() => { setCloudPrompt(null); go('discover', 'cloud'); }}>Ir a Mi nube</button>
        </Sheet>
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      <div className="overlay-warm" style={{ background: 'rgba(255,146,54,' + (eff.warm / 100 * 0.24).toFixed(3) + ')' }} />
      <div className="overlay-dim" style={{ background: 'rgba(0,0,0,' + (eff.dim / 100 * MAX_DIM).toFixed(3) + ')' }} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
