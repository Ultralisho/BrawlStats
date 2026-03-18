import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import fetchApi from '../services/api';

const LI = {
  arrow:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  eye:    (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeoff: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.7 19.7 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.78 19.78 0 0 1-3.21 4.13"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>),
  mail:   (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>),
  lock:   (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>),
  check:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>),
};

const MARQUEE = [
  { lbl: 'Online ahora',   val: '12,841'  },
  { lbl: 'Partidas/hora',  val: '38.2K'   },
  { lbl: 'Top trofeos',    val: '266,174' },
  { lbl: 'Win-rate medio', val: '53.4%'   },
  { lbl: 'Brawlers',       val: '102'     },
];

function LivePreview() {
  const pts = [22, 30, 26, 38, 34, 46, 42, 54, 50, 62, 58, 70];
  const max = 70, min = 20, N = pts.length, W = 240, H = 56;
  const path = pts.map((v, i) => {
    const x = (i / (N - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="lpreview">
      <div className="lpreview-bar">
        <span className="lpreview-dot"/><span className="lpreview-dot"/><span className="lpreview-dot"/>
        <span className="lpreview-tag mono">DASHBOARD · LIVE</span>
      </div>
      <div className="lpreview-grid">
        <div className="lpreview-mini">
          <div className="lpreview-lbl">Trofeos</div>
          <div className="lpreview-val mono">48,210</div>
          <div className="lpreview-delta pos mono">▲ 1,284</div>
        </div>
        <div className="lpreview-mini">
          <div className="lpreview-lbl">Win-rate (7d)</div>
          <div className="lpreview-val mono">63.8%</div>
          <div className="lpreview-delta pos mono">▲ 4.1%</div>
        </div>
      </div>
      <div className="lpreview-chart">
        <div className="lpreview-chart-head">
          <span>RENDIMIENTO · 12 SEMANAS</span>
          <span className="mono">+22.4%</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lpgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#lpgrad)"/>
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="lpreview-events">
        {[
          ['Gem Grab',   'Double Swoosh', '5h 30m' ],
          ['Brawl Ball', 'Super Beach',   '12h 00m'],
          ['Showdown',   'Skull Creek',   '2h 15m' ],
        ].map(([m, map, t]) => (
          <div className="lpreview-event" key={m}>
            <span className="lpreview-event-dot"/>
            <div className="lpreview-event-meta">
              <div className="lpreview-event-mode">{m}</div>
              <div className="lpreview-event-map">{map}</div>
            </div>
            <span className="mono lpreview-event-t">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Rellena todos los campos.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } });
      login({ ...data.user, token: data.token });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lshell lshell--showcase">

      {/* ── Left: brand panel ── */}
      <aside className="lbrandpanel">
        <div className="lbrandpanel-bg" aria-hidden="true">
          <div className="lbrandpanel-glow lbrandpanel-glow--a"/>
          <div className="lbrandpanel-glow lbrandpanel-glow--b"/>
          <div className="lbrandpanel-grid"/>
          <div className="lbrandpanel-noise"/>
        </div>

        <header className="lbrandpanel-top">
          <div className="lbrand">
            <span className="lbrand-mark">B</span>
            <span className="lbrand-text">BRAWL<span>STATS</span></span>
          </div>
          <span className="lpill mono">v 4.2 · build 218</span>
        </header>

        <div className="lbrandpanel-body">
          <div className="leyebrow">
            <span className="leyebrow-dot"/> ACCESO PARA JUGADORES PRO
          </div>
          <h1 className="display lbrandpanel-h1">
            Datos que te<br/>
            hacen <em>ganar</em>.
          </h1>
          <p className="lbrandpanel-lead">
            La única plataforma que cruza tu historial con el meta global y
            recomienda builds en tiempo real.
          </p>
          <LivePreview />
          <div className="lmarquee" aria-hidden="true">
            <div className="lmarquee-track">
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span className="lmarquee-item" key={i}>
                  <em className="mono">{m.val}</em><span>{m.lbl}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <footer className="lbrandpanel-foot">
          <span className="mono">© 2026 BRAWLSTATS</span>
          <span className="lbrandpanel-foot-links">
            <a href="#">Estado</a><a href="#">Docs</a><a href="#">Soporte</a>
          </span>
        </footer>
      </aside>

      {/* ── Right: form panel ── */}
      <main className="lformside">
        <div className="lformside-corner mono">— Acceso seguro · TLS 1.3</div>
        <div className="lformside-box">
          <form className="lform" onSubmit={handleSubmit}>

            <div className="lform-tabs" role="tablist">
              <button type="button" className="lform-tab on">Iniciar sesión</button>
              <button type="button" className="lform-tab" onClick={() => navigate('/register')}>Crear cuenta</button>
              <span className="lform-tab-glide"/>
            </div>

            <div className="lform-head">
              <h2 className="display">Bienvenido de vuelta.</h2>
              <p className="lform-sub">
                Accede para ver tus stats, builds guardadas y rotación de eventos.
              </p>
            </div>

            <div className="lfield">
              <label>Email</label>
              <div className="linput">
                <LI.mail width="16" height="16"/>
                <input
                  type="email" placeholder="tu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lfield">
              <div className="lfield-row">
                <label>Contraseña</label>
                <a href="#" className="llink">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="linput">
                <LI.lock width="16" height="16"/>
                <input
                  type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                />
                <button type="button" className="linput-eye" onClick={() => setShowPw(s => !s)} aria-label="Mostrar/ocultar contraseña">
                  {showPw ? <LI.eyeoff width="16" height="16"/> : <LI.eye width="16" height="16"/>}
                </button>
              </div>
            </div>

            <label className="lcheck">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>
              <span className="lcheck-box"><LI.check width="11" height="11"/></span>
              <span className="lcheck-lbl">Mantener sesión abierta</span>
            </label>

            {error && <div className="alert alert-error">{error}</div>}

            <button
              type="submit"
              className={'lbtn lbtn-primary' + (loading ? ' is-loading' : '')}
              disabled={loading}
            >
              <span>{loading ? 'Conectando…' : 'Entrar a mi cuenta'}</span>
              {!loading && <LI.arrow width="16" height="16"/>}
            </button>

            <p className="lswitch">
              ¿Aún no tienes cuenta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>
                Regístrate gratis
              </a>
            </p>

          </form>
        </div>
      </main>

    </div>
  );
}
