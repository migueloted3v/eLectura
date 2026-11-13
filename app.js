/* eLectura · interfaz (React + JSX vía Babel en el navegador) */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const CFG = window.ELECTURA_CONFIG || {};
const APP_VERSION = '1.7.1';

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
// Caracteres por página: cerca de una pantalla de cel con letra 19. La numeración es fija aunque cambies la letra.
const LOC_SIZE = 900;
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
  wakeLock: true, breakReminder: false, lookup: true, saveWords: true, freeFinished: true, hlColor: 'amarillo', hlStyle: 'fill', goalMin: 10
};
const HL_COLORS = [
  { id: 'amarillo', name: 'Amarillo', solid: '#E8C24A' },
  { id: 'verde', name: 'Verde', solid: '#6FB36A' },
  { id: 'azul', name: 'Azul', solid: '#5C9AD6' },
  { id: 'rosa', name: 'Rosa', solid: '#E07FA0' },
  { id: 'naranja', name: 'Naranja', solid: '#E8924A' }
];
const hlColor = id => HL_COLORS.find(c => c.id === id) || HL_COLORS[0];
const hlSoft = (id, theme) => {
  const h = hlColor(id).solid;
  const n = parseInt(h.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + (theme === 'noche' ? 0.42 : 0.5) + ')';
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
const IBookmark = () => <Icon d="M6 3h12v18l-6-4-6 4z" />;
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
  const url = useObjectUrl(() => book.hasCover ? Svc.getCover(book.id) : Promise.resolve(null), [book.id, book.hasCover, book.coverAt]);
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

/* ================= Medidor de lectura ================= */
function Ring({ value, goal, size = 112, stroke = 12, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ui)" strokeWidth={stroke} />
        {pct > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={(c * pct).toFixed(1) + ' ' + c.toFixed(1)} transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'} />}
      </svg>
      {children && <span className="ring-center">{children}</span>}
    </span>
  );
}
const IFlame = () => <Icon size={16} sw={2}><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3-1-3 0-6 0-8z" /></Icon>;
const fmtMin = m => m >= 60 ? (m / 60).toFixed(m >= 600 ? 0 : 1).replace('.0', '') + ' h' : Math.round(m) + ' min';

function Stats({ profile, log, books, goalMin, onGoal, onBack }) {
  const [tab, setTab] = useState('semana');
  const now = new Date();
  const goalSec = goalMin * 60;
  const todayMin = Reading.secOf(log, now) / 60;
  const st = Reading.streak(log, goalSec, now);
  const week = Reading.weekView(log, goalSec, now);
  const ser = Reading.series(log, tab, now);
  const tot = Reading.totals(log, ser.from, ser.to, goalSec, now);
  const inRange = b => b.finished && b.finishedAt && b.finishedAt >= ser.from.getTime() && b.finishedAt <= Reading.addDays(ser.to, 1).getTime();
  const finishedN = books.filter(inRange).length;
  const sized = books.filter(b => b.totalPages && b.format === 'epub');
  const avgPages = sized.length ? sized.reduce((a, b) => a + b.totalPages, 0) / sized.length : 400;
  const proj = Reading.projection(log, now, avgPages);
  const goalPer = tab === 'semana' ? goalMin : tab === 'mes' ? goalMin * 7 : goalMin * 30;
  const maxV = Math.max(goalPer * 1.5, ...ser.bars.map(b => b.min), 1);
  const H = 120;
  const elapsed = tab === 'semana' ? week.filter(d => d.state !== 'future' && d.state !== 'none').length : null;
  const title = tab === 'semana' ? 'Esta semana' : tab === 'mes' ? now.toLocaleDateString('es-MX', { month: 'long' }).replace(/^./, c => c.toUpperCase()) : String(now.getFullYear());
  const kpis = tab === 'semana'
    ? [[fmtMin(tot.sec / 60), 'leídos'], [tot.pages, 'páginas'], [tot.metDays + '/' + elapsed, 'metas']]
    : tab === 'mes'
      ? [[fmtMin(tot.sec / 60), 'leídos'], [tot.pages, 'páginas'], [finishedN, finishedN === 1 ? 'libro' : 'libros']]
      : [[fmtMin(tot.sec / 60), 'leídos'], [finishedN, finishedN === 1 ? 'libro' : 'libros'], [Reading.bestStreak(log, goalSec, now) + ' días', 'mejor racha']];
  const projText = proj
    ? 'A este ritmo (' + proj.minPerDay.toFixed(proj.minPerDay < 10 ? 1 : 0) + ' min al día) terminarás ~' + Math.max(1, Math.round(proj.booksPerYear)) + (Math.round(proj.booksPerYear) === 1 ? ' libro' : ' libros') + ' al año.'
    : 'Lee al menos 3 días para calcular cuántos libros terminarás al año.';
  const mark = d => d.state === 'met' ? '✓' : d.state === 'today' ? Math.floor(d.sec / 60) : d.state === 'partial' ? '◐' : d.state === 'missed' ? 'D' : '';
  return (
    <div className="screen">
      <TopBar title="Mi lectura" onBack={onBack} right={<span className="avatar sm-avatar" style={{ background: profile.color }}>{profile.name.slice(0, 1).toUpperCase()}</span>} />
      <div className="content">
        <div className="card pad today-card">
          <Ring value={todayMin} goal={goalMin}><strong className="ring-num">{Math.floor(todayMin)}</strong><span className="muted tiny">de {goalMin} min</span></Ring>
          <div className="stack-sm grow">
            <span className="muted tiny upper">Hoy</span>
            <span className="serif strong big">{todayMin >= goalMin ? '¡Meta cumplida!' : 'Te faltan ' + Math.ceil(goalMin - todayMin) + ' min para tu meta'}</span>
            <span className="row-inline small streak"><IFlame /> {st.days} {st.days === 1 ? 'día seguido' : 'días seguidos'}</span>
            <span className="muted tiny">{st.restAvailable ? '1 descanso disponible esta semana' : 'Ya usaste el descanso de esta semana'}</span>
          </div>
        </div>
        <div className="week-row" aria-label="Esta semana">
          {week.map(d => (
            <span key={d.key} className="week-day">
              <span className="muted tiny">{d.label}</span>
              <span className={'week-dot ' + d.state + (d.isToday ? ' is-today' : '')} title={fmtMin(d.sec / 60)}>{mark(d)}</span>
            </span>
          ))}
        </div>
        <p className="muted tiny center legend">✓ Meta cumplida · ◐ Leyó menos · D Descanso</p>
        <Segmented label="Periodo" value={tab} onChange={setTab} options={[{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'anio', label: 'Año' }]} />
        <div className="card pad stack">
          <div className="row-between"><span className="serif strong big">{title}</span><span className="muted small">{fmtMin(tot.sec / 60)}</span></div>
          <div className="chart" style={{ height: H + 20 }}>
            <span className="goal-line" style={{ bottom: Math.min(H, goalPer / maxV * H) + 'px' }} />
            {ser.bars.map((b, i) => (
              <span key={i} className="bar-col">
                <span className="tiny muted">{b.min >= 1 ? (tab === 'anio' ? fmtMin(b.min) : Math.round(b.min)) : ''}</span>
                <span className="bar-v" style={{ height: Math.max(b.min > 0 ? 6 : 2, Math.round(b.min / maxV * H)) + 'px', background: b.min >= goalPer ? 'var(--accent)' : b.min > 0 ? 'var(--accent-soft)' : 'var(--ui)' }} />
              </span>
            ))}
          </div>
          <div className="chart-labels">{ser.bars.map((b, i) => <span key={i} className="tiny muted">{b.label}</span>)}</div>
          <div className="grid3 stats">{kpis.map((k, i) => <span key={i} className="stat"><strong>{k[0]}</strong><span className="muted tiny">{k[1]}</span></span>)}</div>
          <div className="projection"><Icon size={22}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Icon><span>{projText}</span></div>
        </div>
        <div className="card pad stack">
          <span className="strong">Meta diaria</span>
          <Segmented label="Meta diaria" value={String(goalMin)} onChange={v => onGoal(Number(v))}
            options={[5, 10, 15, 20, 30].map(m => ({ id: String(m), label: m + ' min' }))} />
          <p className="muted tiny">Solo cuenta mientras lees: el contador se pausa si pasan 2 minutos sin cambiar de página o tocar la pantalla.</p>
        </div>
      </div>
    </div>
  );
}

/* ================= Biblioteca ================= */
function Library({ profile, books, onOpen, onImportClick, go, onBookAction, todaySec, goalMin, sagas, suggestions, onReviewSagas, libView, onLibView, onNewSaga, onMissingCovers }) {
  const [filter, setFilter] = useState('todos');
  const [menuFor, setMenuFor] = useState(null);
  const current = books.slice().sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0)).find(b => b.hasFile && b.openedAt && !b.finished);
  const inSaga = useMemo(() => { const m = {}; sagas.forEach(s => s.items.forEach(it => { m[it.key] = s; })); return m; }, [sagas]);
  const byKey = useMemo(() => { const m = {}; books.forEach(b => { if (b.fingerprint) m[b.fingerprint] = b; }); return m; }, [books]);
  const langOk = b => filter === 'todos' || b.lang === filter;
  const shown = books.filter(b => !inSaga[b.fingerprint] && langOk(b));
  const shownSagas = sagas.filter(s => filter === 'todos' || s.items.some(it => byKey[it.key] && langOk(byKey[it.key])));
  const byAuthor = libView === 'autores';
  const authors = useMemo(() => groupAuthors(books.filter(langOk)), [books, filter]);
  return (
    <div className="screen">
      <header className="lib-head">
        <div>
          <div className="muted small">Biblioteca de</div>
          <h1 className="display">{profile.name}</h1>
          <button type="button" className="today-chip" onClick={() => go('stats')} aria-label="Ver mi lectura">
            <Ring value={todaySec / 60} goal={goalMin} size={22} stroke={4} />
            <span>{todaySec / 60 >= goalMin ? 'Meta de hoy cumplida' : 'Hoy ' + Math.floor(todaySec / 60) + ' de ' + goalMin + ' min'}</span>
          </button>
        </div>
        <div className="row-inline">
          <button type="button" className="avatar avatar-btn" style={{ background: profile.color }} aria-label="Cambiar de perfil" onClick={() => go('profiles')}>
            {profile.name.slice(0, 1).toUpperCase()}
          </button>
          <button type="button" className="icon-btn" aria-label="Ajustes" onClick={() => go('settings')}><ISliders /></button>
          <span className="version-tag" aria-label={'Versión ' + APP_VERSION}>v{APP_VERSION}</span>
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

        {books.length > 0 && (
          <div className="row-gap view-row">
            <span className="grow"><Segmented label="Ver biblioteca por" value={byAuthor ? 'autores' : 'sagas'} onChange={onLibView}
              options={[{ id: 'sagas', label: 'Sagas' }, { id: 'autores', label: 'Autores' }]} /></span>
            {!byAuthor && books.length > 1 && <button type="button" className="chip new-saga" onClick={onNewSaga}><IFolder /> Nueva saga</button>}
          </div>
        )}
        <div className="row-between">
          <h2 className="h2">{byAuthor ? 'Tus autores' : 'Tus libros'}</h2>
          <Segmented label="Filtrar por idioma" value={filter} onChange={setFilter}
            options={[{ id: 'todos', label: 'Todos' }, { id: 'es', label: 'Español' }, { id: 'en', label: 'Inglés' }]} />
        </div>

        {!byAuthor && suggestions.length > 0 && (
          <div className="saga-banner">
            <IFolder />
            <span className="grow">Encontré {suggestions.length === 1 ? '1 saga' : suggestions.length + ' sagas'} en tus libros</span>
            <button type="button" className="btn sm light" onClick={onReviewSagas}>Revisar</button>
          </div>
        )}

        {books.length === 0 ? (
          <div className="empty">
            <p>Tu biblioteca está vacía. Busca un libro gratuito o abre un EPUB o PDF desde tu celular o tu nube.</p>
          </div>
        ) : byAuthor ? (
          <div className="grid3">
            {authors.map(a => {
              const read = a.books.filter(b => b.finished).length;
              return (
                <div key={a.key} className="book-cell">
                  <button type="button" className="cover-btn" onClick={() => go('author', a.key)} aria-label={'Ver libros de ' + a.name}>
                    {a.books.length > 1
                      ? <SagaCover saga={{ name: a.name, items: a.books.map(b => ({ key: b.fingerprint, title: b.title })) }} byKey={byKey} />
                      : <Cover book={a.books[0]} />}
                  </button>
                  <span className="saga-name">{a.name}</span>
                  <span className="muted small">{a.books.length} {a.books.length === 1 ? 'libro' : 'libros'} · {read} leídos</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid3">
            {shownSagas.map(sg => {
              const read = sg.items.filter(it => byKey[it.key] && byKey[it.key].finished).length;
              return (
                <div key={sg.id} className="book-cell">
                  <button type="button" className="cover-btn" onClick={() => go('saga', sg.id)} aria-label={'Abrir saga ' + sg.name}>
                    <SagaCover saga={sg} byKey={byKey} />
                  </button>
                  <span className="saga-name">{sg.name}</span>
                  <span className="muted small">{read} de {sg.items.length} leídos</span>
                </div>
              );
            })}
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
        {books.filter(b => !b.hasCover).length > 0 && (
          <button type="button" className="btn link-btn" onClick={onMissingCovers}>Buscar portadas que faltan ({books.filter(b => !b.hasCover).length})</button>
        )}
      </div>

      {menuFor && (
        <Sheet label="Opciones del libro" onClose={() => setMenuFor(null)}>
          <div className="sheet-title">{menuFor.title}</div>
          <div className="stack">
            <button type="button" className="btn" onClick={() => { onBookAction('finish', menuFor); setMenuFor(null); }}>
              {menuFor.finished ? 'Marcar como no terminado' : 'Marcar como terminado'}
            </button>
            <button type="button" className="btn" onClick={() => { onBookAction('saga', menuFor); setMenuFor(null); }}>Mover a una saga…</button>
            <button type="button" className="btn" onClick={() => { onBookAction('cover', menuFor); setMenuFor(null); }}>{menuFor.hasCover ? 'Cambiar portada…' : 'Buscar portada…'}</button>
            <button type="button" className="btn" onClick={() => { onBookAction('author', menuFor); setMenuFor(null); }}>Cambiar de autor o corregir título…</button>
            {menuFor.hasFile && menuFor.format === 'pdf' && <button type="button" className="btn primary" onClick={() => { onBookAction('convert', menuFor); setMenuFor(null); }}>Convertir a EPUB</button>}
            {menuFor.hasFile && menuFor.format === 'epub' && <button type="button" className="btn" onClick={() => { onBookAction('download', menuFor); setMenuFor(null); }}>Descargar EPUB</button>}
            {menuFor.hasFile && <button type="button" className="btn" onClick={() => { onBookAction('free', menuFor); setMenuFor(null); }}>Quitar del cel (conserva el progreso)</button>}
            <button type="button" className="btn danger" onClick={() => { if (confirm('¿Eliminar "' + menuFor.title + '" y su progreso?')) { onBookAction('delete', menuFor); setMenuFor(null); } }}>Eliminar por completo</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ================= Autores ================= */
// "Gibson, William" y "William Gibson" son el mismo autor; se usa el primer autor si hay varios.
function authorName(raw) {
  let a = String(raw || '').split(/\s*(?:;|&|\band\b)\s*/i)[0].trim().replace(/\s+/g, ' ');
  const parts = a.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length === 2 && !/\s/.test(parts[0]) || parts.length === 2 && parts[1].split(' ').length <= 3 && parts[0].split(' ').length <= 2) a = parts[1] + ' ' + parts[0];
  return a || 'Autor desconocido';
}
const authorKey = name => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function groupAuthors(books) {
  const g = {};
  books.forEach(b => {
    const name = authorName(b.author), key = authorKey(name);
    (g[key] = g[key] || { key, name, books: [] }).books.push(b);
  });
  const last = n => n === 'Autor desconocido' ? '￿' : n.split(' ').slice(-1)[0];
  return Object.values(g).map(a => ({ ...a, books: a.books.slice().sort((x, y) => x.title.localeCompare(y.title, 'es')) }))
    .sort((x, y) => last(x.name).localeCompare(last(y.name), 'es') || x.name.localeCompare(y.name, 'es'));
}
function AuthorView({ authorKey: key, books, onBack, onOpen, onBookMenu }) {
  const a = groupAuthors(books).find(x => x.key === key);
  if (!a) return <div className="screen"><TopBar title="" onBack={onBack} /><div className="content"><p className="muted">Ya no hay libros de este autor.</p></div></div>;
  const byKey = {}; a.books.forEach(b => { if (b.fingerprint) byKey[b.fingerprint] = b; });
  const read = a.books.filter(b => b.finished).length;
  return (
    <div className="screen">
      <TopBar title="" onBack={onBack} />
      <div className="content">
        <div className="row-inline saga-head">
          {a.books.length > 1 ? <SagaCover saga={{ name: a.name, items: a.books.map(b => ({ key: b.fingerprint, title: b.title })) }} byKey={byKey} height={118} /> : <span className="saga-stack" style={{ height: 118 }}><Cover book={a.books[0]} height={118} /></span>}
          <div className="stack-sm grow">
            <span className="serif strong saga-title">{a.name}</span>
            <span className="muted small">{a.books.length} {a.books.length === 1 ? 'libro' : 'libros'} · {read} de {a.books.length} leídos</span>
            <span className="bar"><span style={{ width: Math.round(read / a.books.length * 100) + '%' }} /></span>
          </div>
        </div>
        <div className="stack-sm">
          {a.books.map(b => {
            const p = b.finished ? 1 : (b.progress && b.progress.percent) || 0;
            return (
              <div key={b.id} className="saga-row card">
                <button type="button" className="saga-open" onClick={() => onOpen(b)}>
                  <Cover book={b} height={56} />
                  <span className="stack-xs grow left">
                    <span className="serif strong">{b.title}</span>
                    <span className="muted tiny">{b.finished ? 'Terminado' : (p > 0 ? Math.round(p * 100) + ' %' : 'Sin empezar') + (b.hasFile ? '' : ' · en tu nube')}{b.series ? ' · ' + b.series + (b.seriesIndex ? ' #' + b.seriesIndex : '') : ''}</span>
                    <span className="bar thin"><span style={{ width: Math.round(p * 100) + '%' }} /></span>
                  </span>
                </button>
                <button type="button" className="icon-btn" aria-label={'Mover ' + b.title} onClick={() => onBookMenu(b)}><IMore /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= Sagas ================= */
const IFolder = () => <Icon><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>;
const IGrip = () => <Icon size={20} sw={2}><path d="M5 8h14M5 12h14M5 16h14" /></Icon>;
// Portada de la saga: la elegida, o la del primer libro (en orden) que tenga imagen, o la del primero.
function sagaFront(saga, byKey) {
  const local = saga.items.map(it => byKey[it.key]).filter(Boolean);
  const chosen = saga.coverKey && byKey[saga.coverKey];
  return chosen || local.find(b => b.hasCover) || local[0] || null;
}
function SagaCover({ saga, byKey, height = 146 }) {
  const front = sagaFront(saga, byKey);
  const t = i => (saga.items[i] && saga.items[i].title) || saga.name;
  return (
    <span className="saga-stack" style={{ height }}>
      <span className="saga-sheet s2" style={{ background: hashColor(t(2) + '2') }} />
      <span className="saga-sheet s1" style={{ background: hashColor(t(1) + '1') }} />
      <span className="saga-front">
        {front ? <Cover book={front} height={height - 8} /> : <span className="cover cover-text" style={{ height: height - 8, background: hashColor(saga.name) }}><span>{saga.name}</span></span>}
      </span>
      <span className="saga-count">{saga.items.length}</span>
    </span>
  );
}

function SagaSuggestSheet({ suggestions, onCreate, onIgnore, onClose }) {
  return (
    <Sheet label="Sagas encontradas" onClose={onClose}>
      <div className="sheet-title">Sagas encontradas</div>
      <p className="muted small">Según los datos de tus EPUB. Al crearla puedes cambiar el orden arrastrando.</p>
      {suggestions.length === 0 && <p className="muted">Ya no hay sagas por revisar.</p>}
      {suggestions.map(sg => (
        <div key={sg.name} className="card pad stack-sm">
          <div className="row-between"><span className="serif strong big">{sg.name}</span><span className="muted tiny">{sg.books.length} libros</span></div>
          <span className="small">{sg.books.map((b, i) => (b.seriesIndex || i + 1) + '. ' + b.title).join('  ·  ')}</span>
          <div className="row-gap">
            <button type="button" className="btn sm primary grow" onClick={() => onCreate(sg)}>Crear carpeta</button>
            <button type="button" className="btn sm" onClick={() => onIgnore(sg)}>Ignorar</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={onClose}>Listo</button>
    </Sheet>
  );
}

function SagaPickSheet({ book, sagas, current, onPick, onCreate, onRemove, onClose }) {
  const [name, setName] = useState(book && book.series ? book.series : '');
  return (
    <Sheet label="Mover a una saga" onClose={onClose}>
      <div className="sheet-title">Mover a una saga</div>
      <p className="muted small ellipsis">{book.title}</p>
      {sagas.length > 0 && (
        <div className="card list">
          {sagas.map(sg => (
            <button key={sg.id} type="button" className="row row-btn" onClick={() => onPick(sg)} disabled={current && current.id === sg.id}>
              <IFolder /><span className="grow left">{sg.name}</span><span className="muted small">{current && current.id === sg.id ? 'Aquí está' : sg.items.length + ' libros'}</span>
            </button>
          ))}
        </div>
      )}
      <label htmlFor="newsaga" className="field-label">Nueva saga</label>
      <div className="row-gap">
        <input id="newsaga" className="input grow" value={name} maxLength={60} placeholder="Nombre de la saga" onChange={e => setName(e.target.value)} />
        <button type="button" className="btn primary" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Crear</button>
      </div>
      {current && <button type="button" className="btn" onClick={onRemove}>Sacar de “{current.name}”</button>}
    </Sheet>
  );
}

function SagaView({ saga, books, onBack, onOpen, onChange, onUndo, onMissing, onBookMenu }) {
  const byKey = useMemo(() => { const m = {}; books.forEach(b => { if (b.fingerprint) m[b.fingerprint] = b; }); return m; }, [books]);
  const [items, setItems] = useState(saga.items);
  const [drag, setDrag] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [newName, setNewName] = useState(saga.name);
  const [picked, setPicked] = useState({});
  const listRef = useRef(null);
  useEffect(() => { if (drag == null) setItems(saga.items); }, [saga]);
  const read = items.filter(it => byKey[it.key] && byKey[it.key].finished).length;
  const pct = it => { const b = byKey[it.key]; return b ? (b.finished ? 1 : (b.progress && b.progress.percent) || 0) : 0; };
  const status = it => {
    const b = byKey[it.key];
    if (!b) return 'No está en este aparato';
    if (b.finished) return 'Terminado';
    const p = pct(it);
    return (p > 0 ? Math.round(p * 100) + ' %' : 'Sin empezar') + (b.hasFile ? '' : ' · en tu nube');
  };
  // Arrastrar con la manija: el libro sigue al dedo y la lista se reacomoda.
  const down = (e, i) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} setDrag(i); };
  const move = e => {
    if (drag == null || !listRef.current) return;
    const rows = Array.from(listRef.current.querySelectorAll('.saga-row'));
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { target = i; break; } }
    if (target !== drag) {
      setItems(prev => { const a = prev.slice(); const [it] = a.splice(drag, 1); a.splice(target, 0, it); return a; });
      setDrag(target);
    }
  };
  const up = () => { if (drag == null) return; setDrag(null); onChange({ ...saga, items }); };
  const loose = books.filter(b => b.fingerprint && !items.some(it => it.key === b.fingerprint));
  return (
    <div className="screen">
      <TopBar title="" onBack={onBack} right={<button type="button" className="icon-btn" aria-label="Opciones de la saga" onClick={() => setSheet('menu')}><IMore /></button>} />
      <div className="content">
        <div className="row-inline saga-head">
          <SagaCover saga={{ ...saga, items }} byKey={byKey} height={118} />
          <div className="stack-sm grow">
            <span className="serif strong saga-title">{saga.name}</span>
            <span className="muted small">{items.length} {items.length === 1 ? 'libro' : 'libros'} · {read} de {items.length} leídos</span>
            <span className="bar"><span style={{ width: (items.length ? Math.round(read / items.length * 100) : 0) + '%' }} /></span>
          </div>
        </div>
        <p className="muted small">Orden de lectura · mantén presionado ≡ y arrastra para cambiarlo</p>
        <div className="stack-sm" ref={listRef} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {items.map((it, i) => {
            const b = byKey[it.key];
            return (
              <div key={it.key} className={'saga-row card' + (drag === i ? ' lifted' : '')}>
                <span className="saga-n">{i + 1}</span>
                <button type="button" className="saga-open" onClick={() => (b ? onOpen(b) : onMissing(it))}>
                  {b ? <Cover book={b} height={56} /> : <span className="cover cover-text" style={{ height: 56, background: hashColor(it.title) }} />}
                  <span className="stack-xs grow left">
                    <span className="serif strong">{b ? b.title : it.title}</span>
                    <span className="muted tiny">{status(it)}</span>
                    <span className="bar thin"><span style={{ width: Math.round(pct(it) * 100) + '%' }} /></span>
                  </span>
                </button>
                {b && <button type="button" className="icon-btn sm" aria-label={'Mover ' + b.title} onClick={() => onBookMenu(b)}><IMore /></button>}
                <span className="saga-handle" role="button" tabIndex={0} aria-label={'Arrastrar ' + it.title} onPointerDown={e => down(e, i)}
                  onKeyDown={e => {
                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                    e.preventDefault();
                    const t = e.key === 'ArrowUp' ? i - 1 : i + 1;
                    if (t < 0 || t >= items.length) return;
                    const a = items.slice(); const [x] = a.splice(i, 1); a.splice(t, 0, x); setItems(a); onChange({ ...saga, items: a });
                  }}><IGrip /></span>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn dashed" onClick={() => { setPicked({}); setSheet('add'); }}>+ Agregar libros a esta saga</button>
      </div>

      {sheet === 'menu' && (
        <Sheet label="Opciones de la saga" onClose={() => setSheet(null)}>
          <div className="sheet-title">{saga.name}</div>
          <button type="button" className="btn" onClick={() => { setNewName(saga.name); setSheet('rename'); }}>Renombrar</button>
          <button type="button" className="btn" onClick={() => setSheet('cover')}>Elegir portada</button>
          <button type="button" className="btn danger" onClick={() => { if (confirm('¿Deshacer la saga "' + saga.name + '"? Los libros vuelven a la biblioteca; no se borra nada.')) onUndo(saga); }}>Deshacer saga</button>
        </Sheet>
      )}
      {sheet === 'rename' && (
        <Sheet label="Renombrar saga" onClose={() => setSheet(null)}>
          <div className="sheet-title">Renombrar</div>
          <input className="input" value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} aria-label="Nombre de la saga" />
          <button type="button" className="btn primary" disabled={!newName.trim()} onClick={() => { onChange({ ...saga, items, name: newName.trim() }); setSheet(null); }}>Guardar</button>
        </Sheet>
      )}
      {sheet === 'cover' && (
        <Sheet label="Elegir portada" onClose={() => setSheet(null)}>
          <div className="sheet-title">Elegir portada</div>
          <div className="grid3">
            {items.map(it => byKey[it.key]).filter(Boolean).map(b => (
              <button key={b.id} type="button" className={'cover-btn pick' + (saga.coverKey === b.fingerprint ? ' on' : '')} onClick={() => { onChange({ ...saga, items, coverKey: b.fingerprint }); setSheet(null); }}>
                <Cover book={b} height={120} />
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => { onChange({ ...saga, items, coverKey: null }); setSheet(null); }}>Automática (primer libro con imagen)</button>
        </Sheet>
      )}
      {sheet === 'add' && (
        <Sheet label="Agregar libros" onClose={() => setSheet(null)}>
          <div className="sheet-title">Agregar a {saga.name}</div>
          {loose.length === 0 ? <p className="muted">No hay más libros en tu biblioteca.</p> : (
            <div className="card list">
              {loose.map(b => (
                <label key={b.id} className="row check-row">
                  <input type="checkbox" checked={!!picked[b.id]} onChange={e => setPicked(p => ({ ...p, [b.id]: e.target.checked }))} />
                  <span className="grow ellipsis">{b.title}</span>
                </label>
              ))}
            </div>
          )}
          <button type="button" className="btn primary" disabled={!Object.values(picked).some(Boolean)} onClick={() => {
            const add = loose.filter(b => picked[b.id]).map(b => ({ key: b.fingerprint, title: b.title }));
            onChange({ ...saga, items: [...items, ...add] }, add.map(a => a.key)); setSheet(null);
          }}>Agregar</button>
        </Sheet>
      )}
    </div>
  );
}

function NewSagaSheet({ books, onCreate, onClose }) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState({});
  const n = Object.values(picked).filter(Boolean).length;
  return (
    <Sheet label="Nueva saga" onClose={onClose}>
      <div className="sheet-title">Nueva saga</div>
      <label htmlFor="saganame" className="field-label">Nombre</label>
      <input id="saganame" className="input" value={name} maxLength={60} placeholder="Ej. Trilogía del Sprawl" onChange={e => setName(e.target.value)} />
      <span className="field-label">Elige los libros en el orden en que se leen</span>
      {books.length === 0 ? <p className="muted">Todos tus libros ya están en alguna saga.</p> : (
        <div className="card list pick-list">
          {books.map(b => (
            <label key={b.id} className="row check-row">
              <input type="checkbox" checked={!!picked[b.id]} onChange={e => setPicked(p => {
                const next = { ...p }; if (e.target.checked) next[b.id] = Date.now(); else delete next[b.id]; return next;
              })} />
              <span className="grow stack-xs"><span className="ellipsis">{b.title}</span><span className="muted tiny">{b.author || 'Autor desconocido'}</span></span>
              {picked[b.id] && <span className="saga-count static">{Object.entries(picked).sort((a, c) => a[1] - c[1]).findIndex(([id]) => id === b.id) + 1}</span>}
            </label>
          ))}
        </div>
      )}
      <button type="button" className="btn primary" disabled={!name.trim() || n === 0} onClick={() => {
        const order = Object.entries(picked).sort((a, c) => a[1] - c[1]).map(([id]) => books.find(b => b.id === id)).filter(Boolean);
        onCreate(name.trim(), order);
      }}>Crear saga{n ? ' con ' + n + (n === 1 ? ' libro' : ' libros') : ''}</button>
    </Sheet>
  );
}

// "William Gibson - Neuromante" → autor y título por separado (también "Título (Autor)").
function splitTitle(title) {
  const t = String(title || '');
  let m = t.match(/^(.{3,60}?)\s+[-–—_]\s+(.{2,})$/);
  if (m) return { author: m[1].trim(), title: m[2].trim() };
  m = t.match(/^(.{2,}?)\s*\(([^()]{3,60})\)\s*$/);
  if (m) return { author: m[2].trim(), title: m[1].trim() };
  return null;
}
function AuthorEditSheet({ book, books, onSave, onClose }) {
  const [name, setName] = useState(book.author || '');
  const [title, setTitle] = useState(book.title || '');
  const authors = groupAuthors(books).filter(a => a.name !== 'Autor desconocido');
  const split = splitTitle(book.title);
  const current = authorKey(authorName(name));
  return (
    <Sheet label="Cambiar de autor" onClose={onClose}>
      <div className="sheet-title">Cambiar de autor</div>
      {split && (
        <button type="button" className="notice suggest" onClick={() => { setName(split.author); setTitle(split.title); }}>
          <span>¿Separar el nombre del archivo? Autor: <strong>{split.author}</strong> · Título: <strong>{split.title}</strong></span>
        </button>
      )}
      {authors.length > 0 && (
        <>
          <span className="field-label">Mover a un autor que ya tienes</span>
          <div className="chips">
            {authors.map(a => (
              <button key={a.key} type="button" className={'chip' + (a.key === current ? ' on' : '')} onClick={() => setName(a.name)}>{a.name}</button>
            ))}
          </div>
        </>
      )}
      <label htmlFor="authname" className="field-label">O escribe un autor nuevo</label>
      <input id="authname" className="input" value={name} maxLength={120} placeholder="Nombre y apellido" onChange={e => setName(e.target.value)} />
      <label htmlFor="booktitle" className="field-label">Título del libro</label>
      <input id="booktitle" className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
      <button type="button" className="btn primary" disabled={!title.trim()} onClick={() => onSave(name.trim(), title.trim())}>Guardar</button>
    </Sheet>
  );
}

function CoverSearchSheet({ book, step, total, onPicked, onSkip, onRemove, onClose }) {
  const split = splitTitle(book.title);
  const [title, setTitle] = useState(split && !book.author ? split.title : book.title);
  const [author, setAuthor] = useState(book.author ? authorName(book.author) : (split ? split.author : ''));
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [saving, setSaving] = useState(null);
  const [err, setErr] = useState('');
  const run = () => {
    if (!navigator.onLine) { setState({ status: 'offline', items: [] }); return; }
    setState({ status: 'loading', items: [] }); setErr('');
    Svc.searchCovers(title, author).then(items => setState({ status: items.length ? 'ok' : 'empty', items })).catch(() => setState({ status: 'error', items: [] }));
  };
  useEffect(run, [book.id]);
  const pick = c => {
    setSaving(c.id); setErr('');
    Svc.setCoverFromUrl(book, c).then(meta => onPicked(meta)).catch(e => setErr(e.message || 'No se pudo guardar esa portada.')).finally(() => setSaving(null));
  };
  return (
    <Sheet label="Buscar portada" onClose={onClose}>
      <div className="row-between"><span className="sheet-title">Buscar portada</span>{total > 1 && <span className="muted small">{step} de {total}</span>}</div>
      <div className="row-inline cover-cur"><Cover book={book} height={72} /><span className="stack-xs"><span className="strong ellipsis">{book.title}</span><span className="muted tiny">{book.author ? authorName(book.author) : 'Sin autor'}</span></span></div>
      <div className="row-gap">
        <input className="input grow" value={title} onChange={e => setTitle(e.target.value)} aria-label="Título para buscar" placeholder="Título" />
        <input className="input grow" value={author} onChange={e => setAuthor(e.target.value)} aria-label="Autor para buscar" placeholder="Autor" />
      </div>
      <button type="button" className="btn" onClick={run}><ISearch /> Buscar de nuevo</button>
      {state.status === 'loading' && <p className="muted">Buscando portadas…</p>}
      {state.status === 'offline' && <div className="notice"><IWifiOff /><span>Sin conexión. Conéctate para buscar portadas.</span></div>}
      {state.status === 'empty' && <p className="muted">No encontré portadas. Prueba con el título sin subtítulo o el apellido del autor.</p>}
      {state.status === 'error' && <div className="notice"><span>Los servicios de portadas no respondieron. Intenta en un momento.</span></div>}
      {state.items.length > 0 && (
        <div className="grid3 cover-grid">
          {state.items.map(c => (
            <button key={c.id} type="button" className="cover-cand" disabled={!!saving} onClick={() => pick(c)} aria-label={'Usar portada de ' + c.title}>
              <img src={c.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span className="tiny ellipsis">{saving === c.id ? 'Guardando…' : [c.year, c.source].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
      {err && <p className="error small">{err}</p>}
      <div className="row-gap">
        {onSkip && <button type="button" className="btn grow" onClick={onSkip}>{step < total ? 'Saltar' : 'Terminar'}</button>}
        {book.coverFromWeb && onRemove && <button type="button" className="btn grow" onClick={onRemove}>Quitar portada</button>}
      </div>
    </Sheet>
  );
}

function BookFolderSheet({ book, saga, onAuthor, onSaga, onRemoveSaga, onCover, onClose }) {
  return (
    <Sheet label="Mover libro" onClose={onClose}>
      <div className="sheet-title ellipsis">{book.title}</div>
      <p className="muted small">{authorName(book.author)}{saga ? ' · ' + saga.name : ''}</p>
      <button type="button" className="btn" onClick={onAuthor}>Cambiar de autor o corregir título…</button>
      <button type="button" className="btn" onClick={onSaga}>{saga ? 'Mover a otra saga o crear una nueva…' : 'Mover a una saga o crear una nueva…'}</button>
      <button type="button" className="btn" onClick={onCover}>{book.hasCover ? 'Cambiar portada…' : 'Buscar portada…'}</button>
      {saga && <button type="button" className="btn" onClick={onRemoveSaga}>Sacar de “{saga.name}”</button>}
    </Sheet>
  );
}

function NextInSagaSheet({ info, onOpen, onClose }) {
  return (
    <Sheet label="Siguiente libro de la saga" onClose={onClose}>
      <div className="sheet-title">¡Terminaste el libro {info.pos}!</div>
      <div className="row-inline">
        {info.book ? <Cover book={info.book} height={68} /> : <span className="cover cover-text" style={{ height: 68, width: 48, background: hashColor(info.item.title) }} />}
        <span className="stack-xs"><span className="muted tiny">Sigue en {info.saga.name} · libro {info.pos + 1}</span><span className="serif strong big">{info.book ? info.book.title : info.item.title}</span></span>
      </div>
      <button type="button" className="btn primary" onClick={onOpen}>{info.book && info.book.hasFile ? 'Empezar el libro ' + (info.pos + 1) : 'Buscarlo en Mi nube'}</button>
      <button type="button" className="btn" onClick={onClose}>Ahora no</button>
    </Sheet>
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
function LookupSheet({ word, sentence, bookLang, bookTitle, canSave, onSave, onClose, initialTab }) {
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
  useEffect(() => { if (initialTab) open(initialTab); }, []);
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

/* ================= Citas: barra de selección ================= */
function SelectionBar({ sel, quote, settings, canLookup, onStyle, onColor, onNote, onLookup, onDelete, onClose }) {
  const style = quote ? quote.style : settings.hlStyle;
  const color = quote ? quote.color : settings.hlColor;
  return (
    <div className="selbar" role="toolbar" aria-label="Marcar cita">
      <div className="row-between">
        <div className="segmented dark-seg" role="group" aria-label="Estilo">
          <button type="button" aria-pressed={style === 'fill'} className={style === 'fill' ? 'on' : ''} onClick={() => onStyle('fill')}>Sombrear</button>
          <button type="button" aria-pressed={style === 'line'} className={(style === 'line' ? 'on ' : '') + 'u'} onClick={() => onStyle('line')}>Subrayar</button>
        </div>
        <div className="row-inline swatches">
          {HL_COLORS.map(c => (
            <button key={c.id} type="button" className={'swatch-dot' + (quote && color === c.id ? ' on' : '')} aria-label={c.name}
              aria-pressed={!!quote && color === c.id} style={{ background: c.solid }} onClick={() => onColor(c.id)} />
          ))}
        </div>
      </div>
      <div className="row-gap">
        <button type="button" className="btn sm grow ghost" onClick={onNote}>{quote && quote.note ? 'Editar nota' : '+ Nota'}</button>
        {quote
          ? <button type="button" className="btn sm grow ghost" onClick={onDelete}>Borrar</button>
          : <>
            <button type="button" className="btn sm grow ghost" disabled={!canLookup} onClick={() => onLookup('meaning')}>Significado</button>
            <button type="button" className="btn sm grow ghost" disabled={!canLookup} onClick={() => onLookup('translation')}>Traducción</button>
          </>}
        <button type="button" className="icon-btn sm ghost-icon" aria-label="Cerrar" onClick={onClose}><IClose /></button>
      </div>
      <p className="tiny selbar-note">{quote ? 'Cita guardada. Cambia color o estilo cuando quieras.' : 'Elige un color para guardar la cita.' + (canLookup ? '' : ' Significado y Traducción: selecciona una sola palabra.')}</p>
    </div>
  );
}

function NoteSheet({ quote, theme, onSave, onClose }) {
  const [text, setText] = useState(quote.note || '');
  return (
    <Sheet label="Nota de la cita" onClose={onClose}>
      <div className="sheet-title">Nota para esta cita</div>
      <p className="serif italic quote-box" style={{ background: hlSoft(quote.color, theme) }}>“{quote.text}”</p>
      <label htmlFor="qnote" className="field-label">Tu nota (opcional)</label>
      <textarea id="qnote" className="input textarea" rows={4} value={text} maxLength={1000}
        placeholder="Por qué te gustó, qué te recuerda…" onChange={e => setText(e.target.value)} />
      <button type="button" className="btn primary" onClick={() => onSave(text.trim())}>Guardar nota</button>
    </Sheet>
  );
}

function QuoteCard({ q, theme, onOpen, onDelete, showBook }) {
  const mark = q.style === 'line'
    ? { borderBottom: '3px solid ' + hlColor(q.color).solid }
    : { background: hlSoft(q.color, theme), borderRadius: 3 };
  return (
    <div className="card quote-card">
      <button type="button" className="quote-main" onClick={() => onOpen(q)}>
        <span className="serif quote-text"><span style={mark}>{q.text}</span></span>
        {q.note && <span className="small quote-note">{q.note}</span>}
        <span className="muted tiny">{[showBook ? q.bookTitle : null, q.where].filter(Boolean).join(', ')}</span>
      </button>
      {onDelete && <button type="button" className="icon-btn sm" aria-label="Borrar cita" onClick={() => onDelete(q)}><IClose /></button>}
    </div>
  );
}

function BookQuotesSheet({ quotes, theme, onGo, onClose }) {
  return (
    <Sheet label="Citas de este libro" onClose={onClose}>
      <div className="sheet-title">Citas de este libro</div>
      {quotes.length === 0
        ? <p className="muted">Aún no marcas citas. Mantén presionado el texto, ajusta la selección y elige un color.</p>
        : <div className="stack-sm">{quotes.map(q => <QuoteCard key={q.id} q={q} theme={theme} onOpen={onGo} />)}</div>}
    </Sheet>
  );
}

function Quotes({ quotes, books, theme, onOpen, onDelete, onBack }) {
  const [filter, setFilter] = useState('todos');
  const shown = quotes.filter(q => filter === 'todos' || q.color === filter);
  const groups = [];
  shown.forEach(q => {
    let g = groups.find(x => x.bookId === q.bookId);
    if (!g) { g = { bookId: q.bookId, title: q.bookTitle, items: [] }; groups.push(g); }
    g.items.push(q);
  });
  return (
    <div className="screen">
      <TopBar title="Mis citas" onBack={onBack} right={<span className="muted small count-right">{shown.length} {shown.length === 1 ? 'cita' : 'citas'}</span>} />
      <div className="content">
        <div className="row-inline" role="group" aria-label="Filtrar por color">
          <button type="button" className={'chip' + (filter === 'todos' ? ' on' : '')} aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>Todas</button>
          {HL_COLORS.map(c => (
            <button key={c.id} type="button" className={'swatch-dot big' + (filter === c.id ? ' on-dark' : '')} aria-label={c.name}
              aria-pressed={filter === c.id} style={{ background: c.solid }} onClick={() => setFilter(c.id)} />
          ))}
        </div>
        {quotes.length === 0 && <div className="empty"><p>Aún no guardas citas. En un libro EPUB, mantén presionado el texto, ajusta la selección y elige un color.</p></div>}
        {quotes.length > 0 && shown.length === 0 && <p className="muted center">No hay citas de ese color.</p>}
        {groups.map(g => {
          const b = books.find(x => x.id === g.bookId);
          return (
            <div key={g.bookId} className="stack-sm">
              <div className="row-between"><span className="serif strong big">{b ? b.title : g.title}</span><span className="muted tiny">{g.items.length} {g.items.length === 1 ? 'cita' : 'citas'}</span></div>
              {g.items.map(q => <QuoteCard key={q.id} q={q} theme={theme} onOpen={onOpen} onDelete={onDelete} />)}
            </div>
          );
        })}
        {quotes.length > 0 && <p className="muted tiny center">Toca una cita para ir a esa página</p>}
      </div>
    </div>
  );
}

/* ================= Vista EPUB ================= */
// Quita scripts, eventos en línea y objetos incrustados del capítulo, y agrega una política que
// impide ejecutar cualquier script del libro. Así el lector puede activar los toques en iPhone sin riesgo.
const CHAPTER_CSP = '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'"/>';
function sanitizeChapter(html) {
  let out = String(html || '')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<(iframe|object|embed|frame|frameset|applet)\b[\s\S]*?(<\/\1\s*>|\/>)/gi, '')
    .replace(/<(iframe|object|embed|frame|frameset|applet|meta\s+http-equiv\s*=\s*["']?refresh)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href|action|formaction)\s*=\s*(["'])\s*(javascript|vbscript):[^"']*\2/gi, '$1="#"');
  if (/<head\b[^>]*>/i.test(out)) out = out.replace(/<head\b[^>]*>/i, m => m + CHAPTER_CSP);
  else out = out.replace(/<html\b[^>]*>/i, m => m + '<head>' + CHAPTER_CSP + '</head>');
  return out;
}
function EpubView({ book, blob, settings, eff, onProgress, onLocations, onToggleChrome, onSelect, onQuoteTap, quotes, startCfi, navRef, setLabel, setPageInfo }) {
  const hostRef = useRef(null);
  const renditionRef = useRef(null);
  const bookRef = useRef(null);
  const cb = useRef({});
  cb.current = { onProgress, onToggleChrome, onSelect, onQuoteTap, settings, quotes };
  const applied = useRef({});
  const contentsRef = useRef(null);
  const [ready, setReady] = useState(0);
  const anchor = useRef(null);
  const stable = useRef(false);
  const showPageRef = useRef(() => {});
  const pal = PALETTE[eff.theme];
  const paginated = settings.flow === 'paginated';

  useEffect(() => {
    let destroyed = false;
    const epub = ePub();
    bookRef.current = epub;
    blob.arrayBuffer().then(buf => epub.open(buf)).then(() => {
      if (destroyed) return;
      // iPhone/iPad: WebKit no entrega toques ni selección a un iframe sin "allow-scripts".
      // Se permite, pero cada capítulo se limpia antes de mostrarse y se bloquea todo script del libro.
      epub.spine.hooks.serialize.register((output, section) => { section.output = sanitizeChapter(output); });
      const rendition = epub.renderTo(hostRef.current, {
        width: '100%', height: '100%', spread: 'none', allowScriptedContent: true,
        flow: paginated ? 'paginated' : 'scrolled-doc', manager: paginated ? 'default' : 'continuous'
      });
      renditionRef.current = rendition;
      rendition.hooks.content.register(contents => {
        const doc = contents.document;
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Atkinson+Hyperlegible:wght@400;700&display=swap';
        doc.head.appendChild(link);
        // Cuando terminan de cargar las tipografías el texto se reacomoda; se vuelve a la página guardada.
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => {
          if (destroyed || !anchor.current) return;
          const target = anchor.current; anchor.current = null;
          rendition.display(target).then(() => { stable.current = true; }).catch(() => { stable.current = true; });
        });
        let x0 = 0, y0 = 0, swiped = false;
        doc.addEventListener('touchstart', e => { x0 = e.changedTouches[0].screenX; y0 = e.changedTouches[0].screenY; swiped = false; }, { passive: true });
        doc.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].screenX - x0, dy = e.changedTouches[0].screenY - y0;
          if (cb.current.settings.flow === 'paginated' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped = true;
            if (dx < 0) navRef.current.next(); else navRef.current.prev();
          }
        }, { passive: true });
        doc.addEventListener('click', () => {
          const sel = doc.getSelection();
          if (swiped || (sel && sel.toString().trim())) return;
          cb.current.onToggleChrome();
        });
        doc.addEventListener('keyup', e => { if (e.key === 'ArrowRight') navRef.current.next(); if (e.key === 'ArrowLeft') navRef.current.prev(); });
      });
      rendition.on('selected', (cfiRange, contents) => {
        const sel = contents.window.getSelection();
        const raw = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
        if (!raw) return;
        contentsRef.current = contents;
        const clean = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
        const word = clean && !/\s/.test(clean) && clean.length <= 40 ? clean : null;
        const sentence = word && sel.rangeCount ? sentenceAround(sel.getRangeAt(0), raw) : '';
        cb.current.onSelect({ cfi: cfiRange, text: raw.length > 1200 ? raw.slice(0, 1197) + '…' : raw, word, sentence });
      });
      const showPage = cfi => {
        const total = epub.locations.length();
        if (!total) { setPageInfo(null); return null; }
        const pct = epub.locations.percentageFromCfi(cfi);
        setPageInfo({ page: Math.min(total, epub.locations.locationFromCfi(cfi) + 1), total });
        return pct;
      };
      showPageRef.current = () => { const l = rendition.currentLocation(); if (l && l.start) showPage(l.start.cfi); };
      rendition.on('relocated', loc => {
        const cfi = loc.start.cfi;
        // En la última pantalla del libro cuenta como terminado aunque aún no estén listas las páginas.
        const pct = loc.atEnd ? 1 : showPage(cfi);
        if (loc.atEnd) showPage(cfi);
        // Mientras la página se acomoda al abrir, no se sobrescribe la posición guardada.
        if (stable.current) cb.current.onProgress({ cfi, percent: pct });
        const chapter = loc.start.href ? (epub.navigation && epub.navigation.get(loc.start.href)) : null;
        setLabel([chapter && chapter.label ? chapter.label.trim() : null, pct != null ? Math.round(pct * 100) + ' %' : null].filter(Boolean).join(', '));
      });
      const userMove = fn => () => { anchor.current = null; stable.current = true; return fn(); };
      navRef.current = {
        next: userMove(() => rendition.next()), prev: userMove(() => rendition.prev()),
        goto: cfi => { anchor.current = null; stable.current = true; return rendition.display(cfi); },
        clearSelection: () => { try { const c = contentsRef.current; if (c) c.window.getSelection().removeAllRanges(); } catch (e) {} }
      };
      rendition.themes.default({
        'p, li, span, div, blockquote, dd, dt, td, h1, h2, h3, h4, h5, h6': { 'color': 'inherit !important', 'font-family': 'inherit !important', 'background': 'transparent !important' },
        'p, li, blockquote': { 'line-height': 'inherit !important' },
        'a': { 'color': 'inherit !important' },
        'img, svg': { 'max-width': '100% !important', 'height': 'auto !important' }
      });
      applyTheme(rendition);
      const target = startCfi || (book.progress && book.progress.cfi) || undefined;
      anchor.current = target || null;
      stable.current = !target;
      // Por si las tipografías no avisan (sin internet o ya cargadas): se da por estable en 3 s.
      setTimeout(() => { if (!destroyed && !stable.current) { anchor.current = null; stable.current = true; } }, 3000);
      const haveLocs = book.locations && book.locationsSize === LOC_SIZE;
      if (haveLocs) { try { epub.locations.load(book.locations); } catch (e) {} }
      return rendition.display(target).then(() => {
        if (!destroyed) { applied.current = {}; setReady(r => r + 1); showPageRef.current(); }
        if (!haveLocs) {
          setTimeout(() => {
            if (destroyed) return;
            epub.locations.generate(LOC_SIZE).then(() => {
              if (destroyed) return;
              onLocations(epub.locations.save());
              showPageRef.current();
            }).catch(() => {});
          }, 1200);
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

  // Pinta las citas guardadas; las vuelve a pintar si cambian o cambia el tema.
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    const want = {};
    (quotes || []).forEach(q => { want[q.id] = q; });
    Object.keys(applied.current).forEach(id => {
      const a = applied.current[id], q = want[id];
      if (!q || q.color !== a.color || q.style !== a.style || a.theme !== eff.theme) {
        try { r.annotations.remove(a.cfi, a.style === 'line' ? 'underline' : 'highlight'); } catch (e) {}
        delete applied.current[id];
      }
    });
    Object.values(want).forEach(q => {
      if (applied.current[q.id]) return;
      const tap = () => cb.current.onQuoteTap(q.id);
      try {
        if (q.style === 'line') {
          r.annotations.underline(q.cfi, { id: q.id }, tap, 'hl-ul', { stroke: hlColor(q.color).solid, 'stroke-opacity': '0.95', 'stroke-width': '3', 'mix-blend-mode': 'normal' });
        } else {
          r.annotations.highlight(q.cfi, { id: q.id }, tap, 'hl', { fill: hlSoft(q.color, eff.theme), 'fill-opacity': '1', 'mix-blend-mode': eff.theme === 'noche' ? 'normal' : 'multiply' });
        }
        applied.current[q.id] = { cfi: q.cfi, color: q.color, style: q.style, theme: eff.theme };
      } catch (e) { console.warn('No se pudo pintar la cita', e); }
    });
  }, [quotes, ready, eff.theme]);

  const sp = SPACING[settings.spacing];
  return (
    <div className="epub-wrap" style={{ padding: paginated ? '8px ' + sp.margin + 'px' : '0' }}>
      <div ref={hostRef} className="epub-host" />
      {paginated && <button type="button" className="edge edge-left" aria-label="Página anterior" style={{ width: sp.margin + 8 }} onClick={() => navRef.current.prev()} />}
      {paginated && <button type="button" className="edge edge-right" aria-label="Página siguiente" style={{ width: sp.margin + 8 }} onClick={() => navRef.current.next()} />}
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
function PdfView({ book, blob, settings, eff, onProgress, onToggleChrome, navRef, setLabel, setPageInfo }) {
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
    setPageInfo({ page, total: pdf.numPages });
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
function Reader({ book, settings, eff, onSettings, onExit, onBookUpdate, onSaveWord, toast, quotes, onQuoteSave, onQuoteDelete, startCfi, onReading }) {
  const [blob, setBlob] = useState(null);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState(false);
  const [label, setLabel] = useState('');
  const [pageInfo, setPageInfo] = useState(null);
  // Medidor: cuenta solo lectura activa (pantalla visible y actividad en los últimos 2 min).
  const lastAct = useRef(Date.now());
  const pending = useRef({ sec: 0, pages: 0 });
  const lastPage = useRef(null);
  const touch = () => { lastAct.current = Date.now(); };
  const flushReading = useCallback(() => {
    const p = pending.current;
    if (p.sec >= 1 || p.pages) { onReading(Math.round(p.sec), p.pages); pending.current = { sec: 0, pages: 0 }; }
  }, [onReading]);
  useEffect(() => {
    let last = Date.now();
    const tick = setInterval(() => {
      const now = Date.now(), dt = Math.min(10, (now - last) / 1000); last = now;
      if (document.visibilityState === 'visible' && now - lastAct.current <= 120000) pending.current.sec += dt;
    }, 5000);
    const save = setInterval(flushReading, 30000);
    const onVis = () => { if (document.visibilityState === 'hidden') flushReading(); else { last = Date.now(); } };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flushReading);
    return () => { clearInterval(tick); clearInterval(save); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', flushReading); flushReading(); };
  }, [flushReading]);
  useEffect(() => {
    if (!pageInfo) return;
    const prev = lastPage.current;
    lastPage.current = pageInfo.page;
    if (prev != null && pageInfo.page > prev && pageInfo.page - prev <= 5) pending.current.pages += pageInfo.page - prev;
    if (metaRef.current.totalPages !== pageInfo.total) metaRef.current = { ...metaRef.current, totalPages: pageInfo.total };
  }, [pageInfo]);
  const [lookup, setLookup] = useState(null);
  const [sel, setSel] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [listOpen, setListOpen] = useState(false);
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
    touch();
    const finished = metaRef.current.finished || (p.percent != null && p.percent >= 0.995);
    const finishedAt = finished && !metaRef.current.finished ? Date.now() : metaRef.current.finishedAt;
    metaRef.current = { ...metaRef.current, progress: { ...metaRef.current.progress, ...p }, openedAt: Date.now(), finished, finishedAt };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onBookUpdate(metaRef.current), 600);
  };
  const onLocations = locs => { metaRef.current = { ...metaRef.current, locations: locs, locationsSize: LOC_SIZE }; onBookUpdate(metaRef.current); };
  const exit = () => { clearTimeout(saveTimer.current); onExit(metaRef.current); };
  // Si cierras o cambias de app, la página se guarda al instante (sin esperar).
  useEffect(() => {
    const flush = () => { clearTimeout(saveTimer.current); onBookUpdate(metaRef.current); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', flush); };
  }, []);
  const bookQuotes = useMemo(() => (quotes || []).filter(q => q.bookId === book.id || (q.bookKey && q.bookKey === book.fingerprint)), [quotes, book.id]);
  const selQuote = sel && sel.quoteId ? bookQuotes.find(q => q.id === sel.quoteId) : null;
  const onSelect = s => { touch(); setLookup(null); setSel({ ...s, quoteId: null }); };
  const onQuoteTap = id => { navRef.current.clearSelection && navRef.current.clearSelection(); setSel({ quoteId: id }); };
  const closeSel = () => { navRef.current.clearSelection && navRef.current.clearSelection(); setSel(null); };
  const ensureQuote = patch => {
    if (selQuote) { const q = { ...selQuote, ...patch }; onQuoteSave(q); return q; }
    const q = { id: Svc.uid(), bookId: book.id, bookKey: book.fingerprint, bookTitle: book.title, cfi: sel.cfi, text: sel.text, note: '',
      color: settings.hlColor, style: settings.hlStyle, where: label, date: new Date().toISOString(), ...patch };
    onQuoteSave(q);
    navRef.current.clearSelection && navRef.current.clearSelection();
    setSel({ quoteId: q.id });
    return q;
  };
  const pickColor = c => { onSettings({ ...settings, hlColor: c }); ensureQuote({ color: c }); };
  const pickStyle = st => { onSettings({ ...settings, hlStyle: st }); if (selQuote) ensureQuote({ style: st }); };
  const openNote = () => setNoteFor(ensureQuote({}).id);
  const lookupFromSel = tab => { const s = sel; closeSel(); setLookup({ word: s.word, sentence: s.sentence, tab }); };

  const isPdf = book.format === 'pdf';
  const View = isPdf ? PdfView : EpubView;
  return (
    <div className="reader">
      <header className={'reader-top' + (chrome ? '' : ' hidden')}>
        <button type="button" className="icon-btn" aria-label="Volver a la biblioteca" onClick={exit}><IBack /></button>
        <div className="reader-title">
          <span className="ellipsis">{book.title}</span>
          <span className="reader-page">{pageInfo ? 'Pág. ' + pageInfo.page.toLocaleString('es-MX') + ' de ' + pageInfo.total.toLocaleString('es-MX') : (isPdf ? '' : 'Contando páginas…')}</span>
        </div>
        {!isPdf && <button type="button" className="icon-btn" aria-label="Citas de este libro" onClick={() => setListOpen(true)}><IBookmark /></button>}
        <button type="button" className="aa-btn" aria-label="Ajustes de lectura" onClick={() => setPanel(true)}>Aa</button>
      </header>
      <div className="reader-body">
        {blob ? <View book={metaRef.current} blob={blob} settings={settings} eff={eff} onProgress={onProgress} onLocations={onLocations}
          onToggleChrome={() => { touch(); if (sel) closeSel(); else setChrome(c => !c); }} onSelect={onSelect} onQuoteTap={onQuoteTap}
          quotes={bookQuotes} startCfi={startCfi} navRef={navRef} setLabel={setLabel} setPageInfo={setPageInfo} />
          : <div className="center-fill muted">Abriendo libro…</div>}
      </div>
      <footer className={'reader-foot' + (chrome ? '' : ' hidden')}>
        {settings.flow === 'paginated' && <button type="button" className="icon-btn" aria-label="Página anterior" onClick={() => navRef.current.prev()}><IBack /></button>}
        <span className="muted small grow center ellipsis">{label}</span>
        {settings.flow === 'paginated' && <button type="button" className="icon-btn" aria-label="Página siguiente" onClick={() => navRef.current.next()}><INext /></button>}
      </footer>
      {panel && <ComfortPanel settings={settings} eff={eff} onChange={onSettings} onClose={() => setPanel(false)} isPdf={isPdf} />}
      {sel && (sel.quoteId ? selQuote : true) && !noteFor && (
        <SelectionBar sel={sel} quote={selQuote} settings={settings} canLookup={!!(sel.word && settings.lookup)}
          onStyle={pickStyle} onColor={pickColor} onNote={openNote} onLookup={lookupFromSel}
          onDelete={() => { onQuoteDelete(selQuote); setSel(null); toast('Cita borrada.'); }} onClose={closeSel} />
      )}
      {noteFor && bookQuotes.find(q => q.id === noteFor) && (
        <NoteSheet quote={bookQuotes.find(q => q.id === noteFor)} theme={eff.theme} onClose={() => setNoteFor(null)}
          onSave={text => { onQuoteSave({ ...bookQuotes.find(q => q.id === noteFor), note: text }); setNoteFor(null); toast('Cita guardada en Mis citas.'); }} />
      )}
      {listOpen && <BookQuotesSheet quotes={bookQuotes} theme={eff.theme} onClose={() => setListOpen(false)}
        onGo={q => { setListOpen(false); navRef.current.goto && navRef.current.goto(q.cfi); }} />}
      {lookup && <LookupSheet word={lookup.word} sentence={lookup.sentence} bookLang={book.lang} bookTitle={book.title} initialTab={lookup.tab}
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

function CloudPanel({ books, onImportClick, onSaveBlob, initialCloud }) {
  const [cloud, setCloud] = useState(initialCloud || 'icloud');
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState({});
  const prints = useMemo(() => new Set(books.filter(b => b.hasFile).flatMap(b => [b.fingerprint, b.driveFileId].filter(Boolean))), [books]);
  const load = () => {
    setStatus('Leyendo tu carpeta…');
    Svc.driveList('').then(f => { setFiles(f); setStatus(''); }).catch(e => { setFiles(null); setStatus(e.message); });
  };
  const connect = () => { setStatus('Abriendo Google…'); Svc.driveConnect().catch(e => setStatus(e.message)); };
  useEffect(() => { if (cloud === 'gdrive' && files === null && Svc.driveHasToken()) load(); }, [cloud]);
  const search = () => { setStatus('Buscando…'); Svc.driveList(q.trim()).then(f => { setFiles(f); setStatus(''); }).catch(e => setStatus(e.message)); };
  const get = f => {
    setBusy(b => ({ ...b, [f.id]: true }));
    Svc.driveDownload(f).then(blob => onSaveBlob(blob, f.name, { source: 'Google Drive', driveFileId: f.id }))
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
          <p className="muted tiny">Dirección de regreso registrada en Google Cloud: <code>{Svc.driveRedirectUri()}</code></p>
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
                const have = prints.has(f.id) || prints.has(Svc.fingerprintOf(f.name, Number(f.size)));
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

function Discover({ sources, books, onBack, onSaveRemote, onSaveBlob, onImportClick, onAddSource, onRemoveSource, initialTab, initialCloud }) {
  const [tab, setTab] = useState(initialTab || sources[0].id);
  const src = sources.find(s => s.id === tab);
  const tabs = [{ id: 'cloud', label: 'Mi nube' }, ...sources.map(s => ({ id: s.id, label: s.name })), { id: 'add', label: '+ Agregar fuente' }];
  return (
    <div className="screen">
      <TopBar title="Buscar libros" onBack={onBack} />
      <div className="content">
        <div className="chips" role="tablist">
          {tabs.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={'chip' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {tab === 'cloud' && <CloudPanel books={books} onImportClick={onImportClick} onSaveBlob={onSaveBlob} initialCloud={initialCloud} />}
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
function Settings({ settings, onChange, profile, profiles, sources, go, onBack, onExport, onImportBackup, onDeleteProfile, vocabCount, quotesCount, books, syncInfo, onSync, driveInfo, onDriveConnect, onDrivePush }) {
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

        <h2 className="section">Diccionario, vocabulario y citas</h2>
        <div className="card list">
          <div className="row"><span className="stack-xs grow"><span>Consultar al seleccionar palabra</span><span className="muted small">Libros EPUB; mantén presionada la palabra</span></span><Toggle on={settings.lookup} label="Consultar al seleccionar palabra" onChange={v => set({ lookup: v })} /></div>
          <div className="row"><span className="grow">Traducir a</span><span className="muted small">Español (México)</span></div>
          <div className="row"><span className="stack-xs grow"><span>Guardar palabras consultadas</span><span className="muted small">Con la frase donde aparecieron</span></span><Toggle on={settings.saveWords} label="Guardar palabras consultadas" onChange={v => set({ saveWords: v })} /></div>
          <button type="button" className="row row-btn" onClick={() => go('vocab')}><span className="grow left">Mi vocabulario</span><span className="link">{vocabCount} {vocabCount === 1 ? 'palabra' : 'palabras'}</span></button>
          <button type="button" className="row row-btn" onClick={() => go('quotes')}><span className="grow left">Mis citas</span><span className="link">{quotesCount} {quotesCount === 1 ? 'cita' : 'citas'}</span></button>
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

        <h2 className="section">Sincronizar entre aparatos</h2>
        <div className="card pad stack">
          <p className="small">Suma tus minutos y mantiene igual tu página, citas, vocabulario, meta y ajustes en todos tus aparatos con la misma cuenta de Google. Los libros no se suben.</p>
          <div className="row-between">
            <span className="stack-xs">
              <span className="strong">{!settings.syncEnabled ? 'Desactivado en este aparato' : syncInfo.status === 'syncing' ? 'Sincronizando…' : syncInfo.status === 'needs-auth' ? 'Conecta Google para sincronizar' : syncInfo.status === 'error' ? 'No se pudo sincronizar' : syncInfo.at ? 'Sincronizado' : 'Aún sin sincronizar'}</span>
              <span className="muted tiny">{syncInfo.at ? 'Última vez: ' + new Date(syncInfo.at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Usa el mismo nombre de perfil en cada aparato'}</span>
            </span>
            <button type="button" className="btn primary sm" disabled={syncInfo.status === 'syncing'} onClick={onSync}>{!settings.syncEnabled ? 'Activar' : syncInfo.status === 'needs-auth' ? 'Conectar' : 'Sincronizar ahora'}</button>
          </div>
          {syncInfo.devices && syncInfo.devices.length > 0 && (
            <div className="stack-xs">
              <span className="muted tiny">Lectura de hoy por aparato</span>
              {syncInfo.devices.map((d, i) => <div key={i} className="row-between small"><span>{d.name}</span><span className="muted">{Math.floor(d.sec / 60)} min</span></div>)}
            </div>
          )}
          {(syncInfo.status === 'needs-auth' || !settings.syncEnabled) && <p className="muted tiny">Dirección de regreso que debe estar registrada en Google Cloud: <code>{Svc.driveRedirectUri()}</code></p>}
          {settings.syncEnabled && <div className="row-between"><span className="stack-xs"><span>Reconectar solo al abrir</span><span className="muted small">Google pide permiso cada hora; la app lo renueva sola cuando abres</span></span><Toggle on={settings.syncAuto !== false} label="Reconectar solo al abrir" onChange={v => onChange({ ...settings, syncAuto: v })} /></div>}
          {settings.syncEnabled && <button type="button" className="btn sm" onClick={() => onChange({ ...settings, syncEnabled: false })}>Dejar de sincronizar en este aparato</button>}
        </div>

        <h2 className="section">Mi carpeta de Google Drive</h2>
        <div className="card pad stack">
          <p className="small">Tus correcciones (título, autor, portada y saga) se guardan dentro de cada EPUB en tu carpeta "{CFG.DRIVE_FOLDER || 'Libros'}", y los libros que agregues de otras fuentes se suben ahí. Quien tenga la carpeta compartida los recibe ya corregidos.</p>
          <div className="row-between">
            <span className="stack-xs">
              <span className="strong">{settings.driveWrite === false ? 'Desactivado' : !Svc.driveCanWrite() ? 'Conecta Google para guardar' : driveInfo.status === 'saving' ? 'Guardando en Drive…' : driveInfo.status === 'error' ? 'No se pudo guardar' : driveInfo.pending ? driveInfo.pending + ' cambios por guardar' : 'Todo guardado en tu Drive'}</span>
              <span className="muted tiny">{driveInfo.status === 'error' && driveInfo.error ? driveInfo.error : 'Google Drive guarda versiones anteriores de cada archivo'}</span>
            </span>
            {settings.driveWrite !== false && (!Svc.driveCanWrite() || driveInfo.status === 'needs-auth'
              ? <button type="button" className="btn primary sm" onClick={onDriveConnect}>Conectar</button>
              : <button type="button" className="btn sm" disabled={driveInfo.status === 'saving'} onClick={onDrivePush}>Guardar ahora</button>)}
          </div>
          <div className="row-between"><span className="stack-xs"><span>Guardar en Drive automáticamente</span><span className="muted small">En este aparato</span></span><Toggle on={settings.driveWrite !== false} label="Guardar en Drive automáticamente" onChange={v => onChange({ ...settings, driveWrite: v })} /></div>
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
        <button type="button" className="btn" onClick={() => { try { sessionStorage.removeItem('electura-update'); } catch (e) {} forceUpdate(); }}>Buscar actualización</button>
      </div>
    </div>
  );
}

/* ================= Convertir Word o PDF a EPUB ================= */
const sizeLabel = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : Svc.mb(b);
function ConvertSheet({ job, onSaveEpub, onKeepOriginal, onDeleteOriginal, onRead, onFinish, toast }) {
  const [step, setStep] = useState(job.autoStart ? 'working' : 'ask');
  const [note, setNote] = useState('Preparando…');
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const [choice, setChoice] = useState(null);
  const [error, setError] = useState(null);
  const started = useRef(false);
  const isPdf = job.kind === 'pdf';
  const extWord = isPdf ? 'PDF' : 'Word';

  const convert = () => {
    if (started.current) return;
    started.current = true;
    setStep('working');
    Conv.toEpub(job.blob, job.name, setNote)
      .then(r => { setResult(r); return onSaveEpub(r); })
      .then(meta => { if (!meta) throw new Error('No se pudo guardar el EPUB.'); setSaved(meta); setStep('done'); })
      .catch(e => { setError(e); setStep('error'); });
  };
  useEffect(() => { if (job.autoStart) convert(); }, []);

  // Si sale sin decidir, se conservan los dos (lo seguro).
  const settle = () => {
    if (isPdf && step === 'done' && !choice && job.source === 'import') onKeepOriginal(job);
  };
  const close = () => { if (step === 'working') return; settle(); onFinish(); };
  const decide = c => {
    setChoice(c);
    if (c === 'delete' && job.source === 'library') onDeleteOriginal(job.book);
    if (c === 'keep' && job.source === 'import') onKeepOriginal(job);
  };
  const download = () => Conv.saveToDevice(result.blob, result.title + '.epub')
    .then(r => { if (r === 'downloaded') toast('EPUB descargado. Guárdalo en tu nube desde Archivos o Descargas.'); })
    .catch(() => toast('No se pudo descargar el EPUB.'));

  return (
    <Sheet label="Convertir a EPUB" onClose={close}>
      <div className="row-inline">
        <span className="file-tag">{isPdf ? 'PDF' : 'DOCX'}</span>
        <span className="stack-xs grow"><span className="serif strong big ellipsis">{job.title || job.name}</span>
          <span className="muted small">{sizeLabel(job.blob.size)}</span></span>
      </div>

      {step === 'ask' && (
        <div className="stack">
          <div className="sheet-title">¿Convertir a EPUB?</div>
          <p>Como EPUB tendrás tamaño de letra real, los tres temas completos y consulta de palabras.</p>
          {isPdf && <div className="notice"><span>Conversión de PDF en prueba: funciona bien con novelas y texto corrido. Tablas, columnas y diseño se pierden, y un PDF escaneado no se puede convertir.</span></div>}
          <button type="button" className="btn primary" onClick={convert}>Convertir a EPUB</button>
          <button type="button" className="btn" onClick={() => { if (isPdf) onKeepOriginal(job); onFinish(); }}>{isPdf ? 'Abrir como PDF' : 'Ahora no'}</button>
        </div>
      )}

      {step === 'working' && (
        <div className="stack">
          <div className="sheet-title">Convirtiendo…</div>
          <span className="bar"><span className="bar-indeterminate" /></span>
          <p className="muted small">{note}</p>
          <p className="muted tiny">Todo ocurre en tu cel, sin internet. No cierres esta ventana.</p>
        </div>
      )}

      {step === 'error' && (
        <div className="stack">
          <div className="sheet-title">No se pudo convertir</div>
          <div className="notice"><span>{error && error.message ? error.message : 'Ocurrió un error al convertir.'}</span></div>
          {isPdf && job.source === 'import' && <button type="button" className="btn primary" onClick={() => { onKeepOriginal(job); onFinish(); }}>Abrir como PDF</button>}
          <button type="button" className="btn" onClick={onFinish}>Cerrar</button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="stack">
          <div className="sheet-title">Listo: ya es EPUB</div>
          <div className="grid3 stats">
            <span className="stat"><strong>{result.chapters}</strong><span className="muted tiny">capítulos</span></span>
            <span className="stat"><strong>{result.images}</strong><span className="muted tiny">imágenes</span></span>
            <span className="stat"><strong>{sizeLabel(result.blob.size)}</strong><span className="muted tiny">tamaño</span></span>
          </div>
          {isPdf && !choice && (
            <div className="card pad stack">
              <span className="strong">¿Borrar el {extWord} original?</span>
              <span className="small">Puedes hojear el EPUB primero con Leer ahora; si sales sin decidir, se quedan los dos.</span>
              <div className="row-gap">
                <button type="button" className="btn grow dark" onClick={() => decide('delete')}>Sí, borrar</button>
                <button type="button" className="btn grow" onClick={() => decide('keep')}>Conservar ambos</button>
              </div>
            </div>
          )}
          {isPdf && choice && <div className="notice"><span>{choice === 'delete' ? 'Listo, en tu biblioteca queda solo el EPUB.' : 'Conservé los dos. Puedes borrar cualquiera desde el menú del libro.'}</span></div>}
          {!isPdf && <p className="muted small">El Word original sigue donde lo tenías, en tu cel o tu nube.</p>}
          <div className="row-gap">
            <button type="button" className="btn primary grow" onClick={() => { settle(); onFinish(); onRead(saved); }}>Leer ahora</button>
            <button type="button" className="btn grow" onClick={download}>Descargar EPUB</button>
          </div>
          <p className="muted tiny center">Descárgalo para guardarlo en iCloud o Google Drive</p>
        </div>
      )}
    </Sheet>
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
  const [quotes, setQuotes] = useState([]);
  const [sagas, setSagas] = useState([]);
  const [sagaDismissed, setSagaDismissed] = useState({});
  const [sagaSheet, setSagaSheet] = useState(null);
  const [nextInfo, setNextInfo] = useState(null);
  const [readingLog, setReadingLog] = useState({});
  const pendingSync = useRef(null);
  const [othersLog, setOthersLog] = useState({});
  const [syncInfo, setSyncInfo] = useState({ at: 0, devices: [], status: '' });
  const mergedLog = useMemo(() => Sync.sumLogs([readingLog, ...Object.values(othersLog).map(d => d.reading || {})]), [readingLog, othersLog]);
  const tombs = useRef({ quotes: {}, vocab: {}, sagas: {} });
  const [startCfi, setStartCfi] = useState(null);
  const [customSources, setCustomSources] = useState([]);
  const [view, setView] = useState({ name: 'library' });
  const [readerBook, setReaderBook] = useState(null);
  const [now, setNow] = useState(new Date());
  const [toastMsg, setToastMsg] = useState(null);
  const [cloudPrompt, setCloudPrompt] = useState(null);
  const [convertQueue, setConvertQueue] = useState([]);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  const toast = useCallback(msg => {
    setToastMsg(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 4200);
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const back = Svc.driveCaptureRedirect();
    Promise.all([Svc.kv.get('profiles', []), Svc.kv.get('currentProfile', null)]).then(([ps, cur]) => {
      setProfiles(ps);
      const id = ps.find(p => p.id === cur) ? cur : (ps[0] && ps[0].id);
      if (id) setPid(id); else setView({ name: 'profiles' });
      if (id && back) {
        if (back.purpose === 'syncsilent') {
          // Renovación automática al abrir: sin cambiar de pantalla ni mostrar errores.
          if (back.ok) pendingSync.current = 'auto';
        } else if (back.purpose === 'sync') {
          // Reconexión silenciosa fallida: no molestar; la conexión manual se ofrece en Ajustes.
          if (back.ok) pendingSync.current = 'manual';
          else if (!/interaction_required|login_required|consent_required/.test(back.error || '')) toast('Google respondió: ' + back.error);
          if (back.ok || !/required/.test(back.error || '')) setView({ name: 'settings' });
        } else {
          setView({ name: 'discover', tab: 'cloud', cloud: 'gdrive' });
          if (back.error) toast(back.error === 'access_denied'
            ? 'Google no dio acceso. Revisa que tu correo esté en Usuarios de prueba.'
            : 'Google respondió: ' + back.error);
        }
      }
      setReady(true);
    }).catch(err => { console.error(err); setReady(true); });
    Svc.requestPersist();
  }, []);

  const refreshBooks = useCallback(() => pid ? Svc.listBooks(pid).then(setBooks) : Promise.resolve(), [pid]);
  useEffect(() => {
    if (!pid) return;
    Svc.kv.set('currentProfile', pid);
    Svc.kv.get('settings:' + pid, null).then(s => setSettingsState({ ...DEFAULT_SETTINGS, ...(s || {}), schedule: { ...DEFAULT_SETTINGS.schedule, ...((s && s.schedule) || {}) } }));
    Svc.kv.get('vocab:' + pid, []).then(setVocab);
    Svc.kv.get('quotes:' + pid, []).then(setQuotes);
    Svc.kv.get('sagas:' + pid, []).then(setSagas);
    Svc.kv.get('sagas-dismissed:' + pid, {}).then(setSagaDismissed);
    Svc.kv.get('reading:' + pid, {}).then(setReadingLog);
    Svc.kv.get('reading-others:' + pid, {}).then(setOthersLog);
    Svc.kv.get('sync-meta:' + pid, { at: 0, devices: [] }).then(m => setSyncInfo({ ...m, status: '' }));
    Svc.kv.get('tombs:' + pid, { quotes: {}, vocab: {}, sagas: {} }).then(t => { tombs.current = { sagas: {}, ...t }; });
    Svc.kv.get('sources:' + pid, []).then(setCustomSources);
    refreshBooks();
  }, [pid]);

  const setSettings = s => {
    const prev = settingsRef.current || {}, now = Date.now(), ts = { ...(prev._ts || {}) };
    Object.keys(s).forEach(k => { if (k !== '_ts' && JSON.stringify(s[k]) !== JSON.stringify(prev[k])) ts[k] = now; });
    const v = { ...s, _ts: ts };
    settingsRef.current = v; setSettingsState(v); if (pid) Svc.kv.set('settings:' + pid, v);
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const othersRef = useRef(othersLog);
  othersRef.current = othersLog;
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

  const go = (name, tab, cloud) => setView({ name, tab, cloud });

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
    const toConvert = [];
    files.reduce((p, f) => p.then(() => {
      const kind = Conv.kindOf(f.name, f.type);
      if (kind === 'docx' || kind === 'pdf') { toConvert.push({ id: Svc.uid(), source: 'import', kind, blob: f, name: f.name }); return; }
      if (kind === 'doc') { toast('Los .doc antiguos no se pueden abrir. Guárdalo como .docx en Word y vuelve a intentar.'); return; }
      return saveBlob(f, f.name, { source: 'archivo', upload: true });
    }), Promise.resolve()).then(() => { if (toConvert.length) setConvertQueue(q => [...q, ...toConvert]); });
  };
  const nextConvert = () => setConvertQueue(q => q.slice(1));
  const saveConverted = r => saveBlob(r.blob, r.title + '.epub', { title: r.title, author: r.author, lang: r.lang, source: 'conversión', upload: true });
  const keepOriginal = job => { if (job.source === 'import') saveBlob(job.blob, job.name, { source: 'archivo', upload: true }); };
  const deleteOriginal = book => Svc.deleteBook(book).then(refreshBooks);

  const saveRemote = r => Svc.downloadBlob(r.download)
    .then(blob => saveBlob(blob, r.title + '.' + r.format, { title: r.title, author: r.author, lang: r.lang, source: r.page, upload: true }))
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
    setTimeout(() => runSync('auto'), 1500);
    if (meta.finished && readerBook && !readerBook.finished) {
      const sg = sagaOf(meta);
      if (sg) {
        const pos = sg.items.findIndex(it => it.key === meta.fingerprint);
        const item = sg.items[pos + 1];
        if (item) setNextInfo({ saga: sg, pos: pos + 1, item, book: books.find(x => x.fingerprint === item.key) || null });
      }
    }
    Svc.updateBook(meta).then(() => {
      if (meta.finished && settings.freeFinished && meta.hasFile) {
        return Svc.freeBook(meta).then(() => toast('Terminaste "' + meta.title + '". Quité el archivo del cel; tu progreso y vocabulario se quedan.'));
      }
    }).then(refreshBooks);
    setReaderBook(null); setStartCfi(null); go('library');
  };
  const bookAction = (action, b) => {
    const done = () => refreshBooks();
    if (action === 'saga') { setSagaSheet({ type: 'pick', book: b }); return; }
    if (action === 'author') { setSagaSheet({ type: 'author', book: b }); return; }
    if (action === 'cover') { setSagaSheet({ type: 'cover', queue: [b.id], i: 0 }); return; }
    if (action === 'finish') Svc.updateBook({ ...b, finished: !b.finished, finishedAt: !b.finished ? Date.now() : null }).then(done);
    if (action === 'free') Svc.freeBook(b).then(() => { toast('Quitado del cel. Bájalo de tu nube cuando quieras seguir.'); done(); });
    if (action === 'delete') Svc.deleteBook(b).then(() => {
      setQuotes(prev => { prev.filter(q => q.bookId === b.id).forEach(q => tomb('quotes', q.id)); const next = prev.filter(q => q.bookId !== b.id); Svc.kv.set('quotes:' + pid, next); return next; });
      toast('Libro eliminado.'); done();
    });
    if (action === 'convert') Svc.getFile(b.id).then(blob => {
      if (!blob) return toast('No encontré el archivo de este libro.');
      setConvertQueue(q => [...q, { id: Svc.uid(), source: 'library', kind: 'pdf', blob, name: b.title + '.pdf', title: b.title, book: b, autoStart: true }]);
    });
    if (action === 'download') Svc.getFile(b.id).then(blob => blob && Conv.saveToDevice(blob, b.title + '.epub'))
      .then(r => { if (r === 'downloaded') toast('EPUB descargado.'); }).catch(() => toast('No se pudo descargar el EPUB.'));
  };

  const tomb = (kind, id) => { tombs.current = { ...tombs.current, [kind]: { ...tombs.current[kind], [id]: Date.now() } }; Svc.kv.set('tombs:' + pid, tombs.current); };
  const saveWord = w => {
    const word = { ...w, updatedAt: Date.now() };
    vocab.filter(x => x.word.toLowerCase() === w.word.toLowerCase() && x.id !== w.id).forEach(x => tomb('vocab', x.id));
    const next = [word, ...vocab.filter(x => x.word.toLowerCase() !== w.word.toLowerCase())];
    setVocab(next); Svc.kv.set('vocab:' + pid, next);
  };
  const saveQuote = q0 => setQuotes(prev => {
    const q = { ...q0, updatedAt: Date.now() };
    const next = prev.some(x => x.id === q.id) ? prev.map(x => x.id === q.id ? q : x) : [q, ...prev];
    Svc.kv.set('quotes:' + pid, next); return next;
  });
  const deleteQuote = q => { tomb('quotes', q.id); setQuotes(prev => { const next = prev.filter(x => x.id !== q.id); Svc.kv.set('quotes:' + pid, next); return next; }); };
  const openQuote = q => {
    const b = books.find(x => x.id === q.bookId) || books.find(x => q.bookKey && x.fingerprint === q.bookKey);
    if (!b) return toast('Ese libro no está en este aparato. Bájalo de tu nube y vuelve a tocar la cita.');
    if (!b.hasFile) { setCloudPrompt(b); return; }
    setStartCfi(q.cfi); openBook(b);
  };
  const addReading = useCallback((sec, pages) => {
    if (!pid) return;
    setReadingLog(prev => {
      const now = new Date();
      const goalSec = (settingsRef.current.goalMin || 10) * 60;
      const next = Reading.add(prev, now, sec, pages, goalSec);
      const others = Object.values(othersRef.current).map(d => d.reading || {});
      const before = Sync.sumLogs([prev, ...others]), after = Sync.sumLogs([next, ...others]);
      if (Reading.secOf(before, now) < goalSec && Reading.secOf(after, now) >= goalSec) {
        const st = Reading.streak(after, goalSec, now);
        setTimeout(() => toast('¡Meta de hoy cumplida! Llevas ' + st.days + (st.days === 1 ? ' día' : ' días') + ' de racha.'), 0);
      }
      Svc.kv.set('reading:' + pid, next);
      return next;
    });
  }, [pid]);
  const deleteWord = id => { tomb('vocab', id); const next = vocab.filter(w => w.id !== id); setVocab(next); Svc.kv.set('vocab:' + pid, next); };
  /* ---------- Sincronizar entre aparatos (Google Drive, carpeta oculta de la app) ---------- */
  const syncBusy = useRef(false);
  const latest = useRef({});
  latest.current = { readingLog, settings, quotes, vocab, books, profile, readerBook, sagas };
  const runSync = useCallback(reason => {
    const L = latest.current;
    if (!pid || !L.profile || syncBusy.current) return Promise.resolve();
    if (!Svc.driveConfigured()) { if (reason === 'manual') toast('Falta configurar Google en config.js.'); return Promise.resolve(); }
    // Solo sincroniza si la activaste tú (en Ajustes); así los perfiles que no la usan nunca van a Google.
    if (reason !== 'manual' && !L.settings.syncEnabled) return Promise.resolve();
    if (!Svc.driveCanSync()) {
      if (reason === 'manual') return Svc.driveConnect('sync');
      if (reason === 'open' && L.settings.syncAuto !== false) {
        let tried = null; try { tried = sessionStorage.getItem('electura-silent'); } catch (e) {}
        if (!tried) { try { sessionStorage.setItem('electura-silent', '1'); } catch (e) {} return Svc.driveConnect('syncsilent', true); }
      }
      setSyncInfo(i => ({ ...i, status: 'needs-auth' }));
      return Promise.resolve();
    }
    syncBusy.current = true;
    setSyncInfo(i => ({ ...i, status: 'syncing' }));
    const progress = {};
    L.books.forEach(b => {
      if (b.fingerprint && b.progress && (b.progress.cfi || b.progress.page)) {
        progress[b.fingerprint] = { cfi: b.progress.cfi || null, percent: b.progress.percent ?? null, page: b.progress.page || null, title: b.title, at: b.openedAt || 0 };
      }
    });
    const meta = {};
    L.books.forEach(b => {
      if (b.fingerprint && (b.metaAt || b.coverAt || b.driveFileId)) {
        meta[b.fingerprint] = { title: b.title, author: b.author || '', metaAt: b.metaAt || 0, coverAt: b.coverAt || 0, driveFileId: b.driveFileId || null,
          drivePushedAt: b.drivePushedAt || 0, at: Math.max(b.metaAt || 0, b.coverAt || 0, b.drivePushedAt || 0) };
      }
    });
    const { _ts, _at, ...settingsValue } = L.settings;
    const local = {
      deviceId: Sync.deviceId(), deviceName: Sync.deviceName(), profile: L.profile.name,
      reading: L.readingLog, settings: { value: settingsValue, ts: _ts || {} },
      quotes: L.quotes, quotesDeleted: tombs.current.quotes, vocab: L.vocab, vocabDeleted: tombs.current.vocab, progress,
      sagas: L.sagas, sagasDeleted: tombs.current.sagas || {}, meta
    };
    return Svc.syncLoad(L.profile.name).then(({ id, doc }) => {
      const m = Sync.merge(local, doc);
      return Svc.syncSave(id, L.profile.name, m.doc).then(() => m.apply);
    }).then(a => {
      setOthersLog(a.others); Svc.kv.set('reading-others:' + pid, a.others);
      // Correcciones hechas en otro aparato: título y autor al instante; la portada se baja del EPUB ya guardado en Drive.
      const metaUpdates = L.books.filter(b => b.fingerprint && a.meta[b.fingerprint]).map(b => {
        const r = a.meta[b.fingerprint];
        const tasks = [];
        if ((r.metaAt || 0) > (b.metaAt || 0) || (!b.driveFileId && r.driveFileId)) {
          tasks.push(Svc.updateBook({ ...b, title: (r.metaAt || 0) > (b.metaAt || 0) ? r.title : b.title, author: (r.metaAt || 0) > (b.metaAt || 0) ? r.author : b.author,
            metaAt: Math.max(r.metaAt || 0, b.metaAt || 0), driveFileId: b.driveFileId || r.driveFileId }));
        }
        if ((r.coverAt || 0) > (b.coverAt || 0) && r.driveFileId && (r.drivePushedAt || 0) >= r.coverAt && b.hasFile && Svc.driveHasToken()) {
          tasks.push(Svc.driveDownload({ id: r.driveFileId }).then(blob => Svc.saveBookFromBlob(blob, b.title + '.epub', pid, { driveFileId: r.driveFileId }))
            .then(res => Svc.updateBook({ ...res.meta, coverAt: r.coverAt, metaAt: Math.max(r.metaAt || 0, b.metaAt || 0) })).catch(() => {}));
        }
        return Promise.all(tasks);
      });
      if (a.settings) {
        const cur = latest.current.settings;
        const v = { ...cur, ...a.settings.value, syncEnabled: true, syncAuto: cur.syncAuto, _ts: { ...(cur._ts || {}), ...a.settings.ts } };
        settingsRef.current = v; setSettingsState(v); Svc.kv.set('settings:' + pid, v);
      }
      else if (!L.settings.syncEnabled) { const v = { ...L.settings, syncEnabled: true }; setSettingsState(v); Svc.kv.set('settings:' + pid, v); }
      const byKey = {}; L.books.forEach(b => { if (b.fingerprint) byKey[b.fingerprint] = b.id; });
      const qs = a.quotes.map(q => (q.bookKey && byKey[q.bookKey] ? { ...q, bookId: byKey[q.bookKey] } : q));
      setQuotes(qs); Svc.kv.set('quotes:' + pid, qs);
      setVocab(a.vocab); Svc.kv.set('vocab:' + pid, a.vocab);
      setSagas(a.sagas); Svc.kv.set('sagas:' + pid, a.sagas);
      tombs.current = { quotes: a.quotesDeleted, vocab: a.vocabDeleted, sagas: a.sagasDeleted }; Svc.kv.set('tombs:' + pid, tombs.current);
      const openId = L.readerBook && L.readerBook.id;
      const updates = L.books.filter(b => b.fingerprint && a.progress[b.fingerprint] && b.id !== openId && (a.progress[b.fingerprint].at || 0) > (b.openedAt || 0))
        .map(b => {
          const p = a.progress[b.fingerprint];
          return Svc.updateBook({ ...b, openedAt: p.at, progress: { ...b.progress, cfi: p.cfi || (b.progress && b.progress.cfi), percent: p.percent, page: p.page || (b.progress && b.progress.page) } });
        });
      const today = Reading.dayKey(new Date());
      const devices = [{ name: Sync.deviceName() + ' (este)', sec: (L.readingLog[today] || {}).sec || 0 }]
        .concat(Object.values(a.others).map(d => ({ name: d.name, sec: ((d.reading || {})[today] || {}).sec || 0, at: d.at })));
      const info = { at: Date.now(), devices };
      setSyncInfo({ ...info, status: 'ok' }); Svc.kv.set('sync-meta:' + pid, info);
      return Promise.all(updates.concat(metaUpdates)).then(() => { if (updates.length || metaUpdates.length) refreshBooks(); if (reason === 'manual') toast('Sincronizado con tus otros aparatos.'); });
    }).catch(e => {
      setSyncInfo(i => ({ ...i, status: e.code === 'auth' || e.code === 'scope' ? 'needs-auth' : 'error' }));
      if (reason === 'manual') toast(e.message || 'No se pudo sincronizar.');
    }).finally(() => { syncBusy.current = false; });
  }, [pid]);
  // Al abrir, cada 5 minutos con la app a la vista y al volver a ella.
  useEffect(() => {
    if (!pid || !profile) return;
    const t0 = setTimeout(() => runSync(pendingSync.current || 'open'), 1500);
    pendingSync.current = null;
    const iv = setInterval(() => { if (document.visibilityState === 'visible') runSync('auto'); }, 5 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') runSync('auto'); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearTimeout(t0); clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [pid, !!profile]);

  /* ---------- Sagas ---------- */
  const persistSagas = next => { setSagas(next); Svc.kv.set('sagas:' + pid, next); };

  /* ---------- Guardar correcciones y libros en la carpeta de Drive ---------- */
  const [driveInfo, setDriveInfo] = useState({ status: '', pending: 0 });
  const driveBusy = useRef(false), driveTimer = useRef(null);
  const pushDrive = useCallback(() => {
    if (driveBusy.current || !pid) return Promise.resolve();
    if (settingsRef.current.driveWrite === false || !Svc.driveCanWrite() || !navigator.onLine) return Promise.resolve();
    driveBusy.current = true;
    return Svc.listBooks(pid).then(list => {
      const queue = list.filter(b => b.driveDirty && b.hasFile && (b.format === 'epub' || b.format === 'pdf'));
      setDriveInfo({ status: queue.length ? 'saving' : 'ok', pending: queue.length });
      if (!queue.length) return;
      let remoteFiles = null;
      const findRemote = b => (remoteFiles ? Promise.resolve(remoteFiles) : Svc.driveList('').then(f => (remoteFiles = f)).catch(() => (remoteFiles = [])))
        .then(files => {
          // Mismo libro en Drive: por su identidad, por nombre y tamaño, o por el nombre original del archivo.
          const base = String(b.fingerprint || '').split('|')[0];
          const f = files.find(x => x.appProperties && x.appProperties.electuraId === b.fingerprint)
            || files.find(x => Svc.fingerprintOf(x.name, Number(x.size)) === b.fingerprint)
            || files.find(x => Svc.cleanName(x.name).toLowerCase() === base);
          return f ? f.id : null;
        });
      // Libro que ya existe en Drive y aquí no tiene correcciones: se enlaza y se baja la versión de Drive (no se sube otra copia ni se pisa).
      const linkAndPull = (b, id) => Svc.driveDownload({ id }).then(blob => Svc.saveBookFromBlob(blob, b.title + '.' + b.format, pid, { driveFileId: id }))
        .then(res => {
          const m = res.meta;
          const keep = { progress: m.progress || b.progress, openedAt: Math.max(m.openedAt || 0, b.openedAt || 0) || null, locations: m.id === b.id ? m.locations : null, finished: m.finished || b.finished };
          return Svc.updateBook({ ...m, ...keep, driveFileId: id, driveDirty: false, drivePushedAt: Date.now() })
            .then(() => (m.id !== b.id ? Svc.deleteBook(b) : null));
        });
      return queue.reduce((p, b) => p.then(() => (b.driveFileId ? Promise.resolve(null) : findRemote(b)).then(found => {
        const hasEdits = !!(b.metaAt || b.coverFromWeb || b.seriesFromApp);
        if (found && !hasEdits) return linkAndPull(b, found).then(() => setDriveInfo(i => ({ ...i, pending: Math.max(0, i.pending - 1) })));
        return Promise.all([Svc.getFile(b.id), b.coverFromWeb ? Svc.getCover(b.id) : null]).then(([blob, cover]) => {
        if (!blob) return;
        const mime = b.format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
        const out = b.format === 'epub'
          ? Conv.rewriteEpub(blob, { title: b.title, author: b.author, series: b.series, seriesIndex: b.seriesIndex, cover: cover, eid: b.fingerprint }).catch(() => blob)
          : Promise.resolve(blob);
        return out.then(file => Promise.resolve(b.driveFileId || found).then(id => {
          const name = (b.author ? authorName(b.author) + ' - ' : '') + b.title.replace(/[\\/:*?"<>|]+/g, ' ') + '.' + b.format;
          const create = () => Svc.driveTargetFolder().then(folder => Svc.driveCreateFile(folder, name, file, mime, b.fingerprint));
          return (id ? Svc.driveUpdateFile(id, file, mime, b.fingerprint).catch(e => (/404/.test(e.message) ? create() : Promise.reject(e))) : create());
        })).then(res => Svc.listBooks(pid).then(cur => {
          const now = cur.find(x => x.id === b.id) || b;
          return Svc.updateBook({ ...now, driveFileId: res.id, driveDirty: false, drivePushedAt: Date.now() });
        })).then(() => setDriveInfo(i => ({ ...i, pending: Math.max(0, i.pending - 1) })));
        });
      })), Promise.resolve()).then(() => { setDriveInfo({ status: 'ok', pending: 0, at: Date.now() }); return refreshBooks(); });
    }).catch(e => {
      setDriveInfo(i => ({ ...i, status: e.code === 'auth' || e.code === 'scope' ? 'needs-auth' : 'error', error: e.message }));
    }).finally(() => { driveBusy.current = false; });
  }, [pid]);
  const scheduleDrive = () => { clearTimeout(driveTimer.current); driveTimer.current = setTimeout(pushDrive, 2500); };
  // Una sola vez: lo que corregiste antes de esta versión y los libros que no vienen de Drive quedan pendientes de guardar.
  useEffect(() => {
    if (!pid) return;
    Svc.kv.get('drive-migrated:' + pid, false).then(done => {
      if (done) return;
      return Svc.listBooks(pid).then(list => Promise.all(list.filter(b => b.hasFile && !b.driveFileId && !b.driveDirty &&
        (b.metaAt || b.coverFromWeb || b.seriesFromApp || b.source !== 'Google Drive')).map(b => Svc.updateBook({ ...b, driveDirty: true }))))
        .then(() => Svc.kv.set('drive-migrated:' + pid, true)).then(refreshBooks);
    });
  }, [pid]);
  useEffect(() => {
    if (!pid) return;
    const t = setTimeout(pushDrive, 4000);
    const onOnline = () => pushDrive();
    window.addEventListener('online', onOnline);
    return () => { clearTimeout(t); window.removeEventListener('online', onOnline); };
  }, [pid]);
  useEffect(() => { setDriveInfo(i => ({ ...i, pending: books.filter(b => b.driveDirty && b.hasFile).length })); if (books.some(b => b.driveDirty)) scheduleDrive(); }, [books]);
  // La saga y su número de tomo viajan dentro del EPUB (formato Calibre) para que otros aparatos la reconozcan solos.
  useEffect(() => {
    if (!pid || !books.length) return;
    const want = {};
    sagas.forEach(sg => sg.items.forEach((it, i) => { want[it.key] = { series: sg.name, seriesIndex: i + 1 }; }));
    const changes = books.filter(b => b.fingerprint).map(b => {
      const w = want[b.fingerprint];
      if (w && (b.series !== w.series || b.seriesIndex !== w.seriesIndex)) return { ...b, series: w.series, seriesIndex: w.seriesIndex, seriesFromApp: true, driveDirty: true };
      if (!w && b.seriesFromApp && b.series) return { ...b, series: null, seriesIndex: null, seriesFromApp: false, driveDirty: true };
      return null;
    }).filter(Boolean);
    if (changes.length) Promise.all(changes.map(Svc.updateBook)).then(refreshBooks);
  }, [sagas, books.length]);
  // Un libro vive en una sola saga: al agregarlo a una, sale de las demás.
  const saveSaga = (sg, movedKeys) => {
    const s1 = { ...sg, updatedAt: Date.now() };
    const keys = movedKeys || [];
    const others = sagas.filter(x => x.id !== sg.id).map(x => keys.some(k => x.items.some(it => it.key === k))
      ? { ...x, items: x.items.filter(it => !keys.includes(it.key)), updatedAt: Date.now() } : x);
    const exists = sagas.some(x => x.id === sg.id);
    persistSagas(exists ? sagas.map(x => x.id === sg.id ? s1 : others.find(o => o.id === x.id)) : [s1, ...others]);
  };
  const undoSaga = sg => { tomb('sagas', sg.id); persistSagas(sagas.filter(x => x.id !== sg.id)); go('library'); toast('Saga deshecha. Los libros volvieron a tu biblioteca.'); };
  const sagaOf = b => sagas.find(s => s.items.some(it => it.key === b.fingerprint));
  const sortSeries = list => list.slice().sort((a, b) => (a.seriesIndex || 999) - (b.seriesIndex || 999) || a.title.localeCompare(b.title));
  const suggestions = useMemo(() => {
    const used = {}; sagas.forEach(s => s.items.forEach(it => { used[it.key] = 1; }));
    const groups = {};
    books.forEach(b => {
      if (!b.series || !b.fingerprint || used[b.fingerprint]) return;
      const k = b.series.trim().toLowerCase();
      if (sagaDismissed[k]) return;
      (groups[k] = groups[k] || { key: k, name: b.series.trim(), books: [] }).books.push(b);
    });
    return Object.values(groups).filter(g => g.books.length >= 2).map(g => ({ ...g, books: sortSeries(g.books) }));
  }, [books, sagas, sagaDismissed]);
  const createSagaFrom = (name, list) => {
    const existing = sagas.find(s => s.name.toLowerCase() === name.toLowerCase());
    const items = list.map(b => ({ key: b.fingerprint, title: b.title }));
    if (existing) saveSaga({ ...existing, items: [...existing.items.filter(it => !items.some(n => n.key === it.key)), ...items] }, items.map(i => i.key));
    else saveSaga({ id: Svc.uid(), name, items, coverKey: null }, items.map(i => i.key));
  };
  const dismissSuggestion = sg => { const next = { ...sagaDismissed, [sg.key]: Date.now() }; setSagaDismissed(next); Svc.kv.set('sagas-dismissed:' + pid, next); };
  // EPUB guardados antes de esta versión: buscar su saga una sola vez, en segundo plano.
  const scanning = useRef(false);
  useEffect(() => {
    if (scanning.current || !pid) return;
    const pending = books.filter(b => b.format === 'epub' && b.hasFile && !b.seriesScanned);
    if (!pending.length) return;
    scanning.current = true;
    pending.reduce((p, b) => p.then(() => Svc.scanSeries(b).catch(() => null)), Promise.resolve())
      .then(() => refreshBooks()).finally(() => { scanning.current = false; });
  }, [books, pid]);

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
      onBookUpdate={m => Svc.updateBook(m)} onSaveWord={saveWord} toast={toast}
      quotes={quotes} onQuoteSave={saveQuote} onQuoteDelete={deleteQuote} startCfi={startCfi} onReading={addReading} />;
  } else if (view.name === 'discover') {
    screen = <Discover sources={sources} books={books} initialTab={view.tab} initialCloud={view.cloud} onBack={() => go('library')} onSaveRemote={saveRemote} onSaveBlob={saveBlob}
      onImportClick={() => fileRef.current.click()} onAddSource={addSource} onRemoveSource={removeSource} />;
  } else if (view.name === 'settings') {
    screen = <Settings settings={settings} onChange={setSettings} profile={profile} profiles={profiles} sources={sources} go={go}
      onBack={() => go('library')} onExport={exportBackup} onImportBackup={importBackup} onDeleteProfile={deleteProfile} vocabCount={vocab.length} quotesCount={quotes.length} books={books}
      syncInfo={syncInfo} onSync={() => runSync('manual')}
      driveInfo={driveInfo} onDriveConnect={() => Svc.driveConnect('drive')} onDrivePush={() => { Svc.listBooks(pid).then(l => Promise.all(l.filter(b => b.driveFileId === undefined || b.driveFileId === null).filter(b => b.hasFile).map(b => Svc.updateBook({ ...b, driveDirty: true })))).then(pushDrive); }} />;
  } else if (view.name === 'author') {
    screen = <AuthorView authorKey={view.tab} books={books} onBack={() => go('library')} onOpen={openBook} onBookMenu={b => setSagaSheet({ type: 'folder', book: b })} />;
  } else if (view.name === 'saga' && sagas.find(s => s.id === view.tab)) {
    screen = <SagaView key={view.tab} saga={sagas.find(s => s.id === view.tab)} books={books} onBack={() => go('library')} onOpen={openBook} onBookMenu={b => setSagaSheet({ type: 'folder', book: b })}
      onChange={saveSaga} onUndo={undoSaga} onMissing={() => { toast('Ese libro no está en este aparato. Búscalo en Mi nube o en tus fuentes.'); go('discover', 'cloud'); }} />;
  } else if (view.name === 'stats') {
    screen = <Stats profile={profile} log={mergedLog} books={books} goalMin={settings.goalMin || 10} onGoal={m => { setSettings({ ...settings, goalMin: m }); setReadingLog(prev => { const next = Reading.setGoal(prev, new Date(), m * 60); Svc.kv.set('reading:' + pid, next); return next; }); }} onBack={() => go('library')} />;
  } else if (view.name === 'quotes') {
    screen = <Quotes quotes={quotes} books={books} theme={eff.theme} onOpen={openQuote} onDelete={deleteQuote} onBack={() => go('settings')} />;
  } else if (view.name === 'vocab') {
    screen = <Vocab words={vocab} onDelete={deleteWord} onBack={() => go('settings')} />;
  } else {
    screen = <Library profile={profile} books={books} onOpen={openBook} onImportClick={() => fileRef.current.click()} go={go} onBookAction={bookAction}
      todaySec={Reading.secOf(mergedLog, new Date())} goalMin={settings.goalMin || 10}
      sagas={sagas} suggestions={suggestions} onReviewSagas={() => setSagaSheet({ type: 'suggest' })}
      libView={settings.libView || 'sagas'} onLibView={v => setSettings({ ...settings, libView: v })} onNewSaga={() => setSagaSheet({ type: 'new' })}
      onMissingCovers={() => { const q = books.filter(b => !b.hasCover).map(b => b.id); if (q.length) setSagaSheet({ type: 'cover', queue: q, i: 0 }); }} />;
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
      {convertQueue[0] && view.name !== 'reader' && (
        <ConvertSheet key={convertQueue[0].id} job={convertQueue[0]} toast={toast}
          onSaveEpub={saveConverted} onKeepOriginal={keepOriginal} onDeleteOriginal={deleteOriginal}
          onRead={meta => meta && openBook(meta)} onFinish={nextConvert} />
      )}
      {sagaSheet && sagaSheet.type === 'suggest' && (
        <SagaSuggestSheet suggestions={suggestions} onClose={() => setSagaSheet(null)}
          onCreate={sg => { createSagaFrom(sg.name, sg.books); toast('Saga creada: ' + sg.name); }} onIgnore={dismissSuggestion} />
      )}
      {sagaSheet && sagaSheet.type === 'new' && (
        <NewSagaSheet books={books.filter(b => b.fingerprint && !sagaOf(b))} onClose={() => setSagaSheet(null)}
          onCreate={(name, list) => { createSagaFrom(name, list); setSagaSheet(null); toast('Saga creada: ' + name + '. Ábrela para cambiar el orden si hace falta.'); }} />
      )}
      {sagaSheet && sagaSheet.type === 'cover' && books.find(b => b.id === sagaSheet.queue[sagaSheet.i]) && (() => {
        const q = sagaSheet, book = books.find(b => b.id === q.queue[q.i]);
        const next = () => (q.i + 1 < q.queue.length ? setSagaSheet({ ...q, i: q.i + 1 }) : setSagaSheet(null));
        return (
          <CoverSearchSheet key={book.id} book={book} step={q.i + 1} total={q.queue.length} onClose={() => setSagaSheet(null)}
            onSkip={q.queue.length > 1 ? next : null}
            onPicked={meta => { Svc.updateBook({ ...meta, driveDirty: true }).then(() => { refreshBooks(); scheduleDrive(); }); toast('Portada guardada.'); next(); }}
            onRemove={() => Svc.removeWebCover(book).then(m => Svc.updateBook({ ...m, driveDirty: true })).then(() => { refreshBooks(); scheduleDrive(); setSagaSheet(null); toast('Portada quitada.'); })} />
        );
      })()}
      {sagaSheet && sagaSheet.type === 'folder' && (
        <BookFolderSheet book={sagaSheet.book} saga={sagaOf(sagaSheet.book)} onClose={() => setSagaSheet(null)}
          onAuthor={() => setSagaSheet({ type: 'author', book: sagaSheet.book })}
          onSaga={() => setSagaSheet({ type: 'pick', book: sagaSheet.book })}
          onCover={() => setSagaSheet({ type: 'cover', queue: [sagaSheet.book.id], i: 0 })}
          onRemoveSaga={() => { const sg = sagaOf(sagaSheet.book); saveSaga({ ...sg, items: sg.items.filter(it => it.key !== sagaSheet.book.fingerprint) }); setSagaSheet(null); toast('Sacado de ' + sg.name + '.'); }} />
      )}
      {sagaSheet && sagaSheet.type === 'author' && (
        <AuthorEditSheet book={sagaSheet.book} onClose={() => setSagaSheet(null)}
          books={books} onSave={(name, title) => {
            const b = sagaSheet.book;
            Svc.updateBook({ ...b, author: name, title, metaAt: Date.now(), driveDirty: true }).then(() => { refreshBooks(); scheduleDrive(); });
            if (title !== b.title) persistSagas(sagas.map(sg => ({ ...sg, items: sg.items.map(it => it.key === b.fingerprint ? { ...it, title } : it) })));
            setSagaSheet(null); toast(name ? 'Movido a ' + authorName(name) + '.' : 'Guardado.');
          }} />
      )}
      {sagaSheet && sagaSheet.type === 'pick' && (
        <SagaPickSheet book={sagaSheet.book} sagas={sagas} current={sagaOf(sagaSheet.book)} onClose={() => setSagaSheet(null)}
          onPick={sg => { saveSaga({ ...sg, items: [...sg.items, { key: sagaSheet.book.fingerprint, title: sagaSheet.book.title }] }, [sagaSheet.book.fingerprint]); setSagaSheet(null); toast('Movido a ' + sg.name); }}
          onCreate={name => { createSagaFrom(name, [sagaSheet.book]); setSagaSheet(null); toast('Saga creada: ' + name); }}
          onRemove={() => { const sg = sagaOf(sagaSheet.book); saveSaga({ ...sg, items: sg.items.filter(it => it.key !== sagaSheet.book.fingerprint) }); setSagaSheet(null); }} />
      )}
      {nextInfo && view.name !== 'reader' && (
        <NextInSagaSheet info={nextInfo} onClose={() => setNextInfo(null)}
          onOpen={() => { const n = nextInfo; setNextInfo(null); if (n.book && n.book.hasFile) openBook(n.book); else go('discover', 'cloud'); }} />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      <div className="overlay-warm" style={{ background: 'rgba(255,146,54,' + (eff.warm / 100 * 0.24).toFixed(3) + ')' }} />
      <div className="overlay-dim" style={{ background: 'rgba(0,0,0,' + (eff.dim / 100 * MAX_DIM).toFixed(3) + ')' }} />
    </>
  );
}

// Si el cel quedó con una mezcla de versiones (pantalla vieja con código nuevo), limpia y recarga una vez.
function forceUpdate() {
  try { sessionStorage.setItem('electura-update', APP_VERSION); } catch (e) {}
  const clear = window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : Promise.resolve();
  const regs = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.update().catch(() => {})))) : Promise.resolve();
  Promise.all([clear, regs]).catch(() => {}).then(() => location.reload());
}
let alreadyTried = null;
try { alreadyTried = sessionStorage.getItem('electura-update'); } catch (e) {}
if (window.ELECTURA_SHELL !== APP_VERSION && alreadyTried !== APP_VERSION) forceUpdate();
else ReactDOM.createRoot(document.getElementById('root')).render(<App />);
