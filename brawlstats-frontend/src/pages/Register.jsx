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
  user:   (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  check:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>),
  shield: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><polyline points="9 12 11 14 15 10"/></svg>),
  trend:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  users:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
};

const MARQUEE = [
  { lbl: 'Online ahora',   val: '12,841'  },
  { lbl: 'Partidas/hora',  val: '38.2K'   },
  { lbl: 'Top trofeos',    val: '266,174' },
  { lbl: 'Win-rate medio', val: '53.4%'   },
  { lbl: 'Brawlers',       val: '102'     },
];

const FEATURES = [
  { Icon: LI.shield, label: 'Cuenta segura con cifrado de extremo a extremo' },
  { Icon: LI.trend,  label: 'Seguimiento de trofeos y progreso histórico'     },
  { Icon: LI.users,  label: 'Compara tu rendimiento con la comunidad global'  },
];

function pwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)              s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[0-9]/.test(pw))           s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  return s;
}
const STRENGTH_LABEL = ['', 'débil', 'regular', 'buena', 'fuerte'];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw]   = useState(false);
  const [showCp, setShowCp]   = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const strength = pwStrength(form.password);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const field = (k) => ({ onChange: e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(ev => ({ ...ev, [k]: null })); } });

  function validate() {
    const e = {};
    if (!form.name.trim())              e.name    = 'El nombre es obligatorio';
    else if (form.name.trim().length < 2) e.name  = 'El nombre debe tener al menos 2 caracteres';
    if (!form.email)                    e.email   = 'El email es obligatorio';
    else if (!EMAIL_RE.test(form.email)) e.email  = 'Introduce un email válido (ej: usuario@correo.com)';
    if (!form.password)                 e.password = 'La contraseña es obligatoria';
    else if (form.password.length < 8)  e.password = 'La contraseña debe tener al menos 8 caracteres';
    else if (!/[a-zA-Z]/.test(form.password)) e.password = 'La contraseña debe contener al menos una letra';
    else if (!/[0-9]/.test(form.password))    e.password = 'La contraseña debe contener al menos un número';
    if (!form.confirmPassword)          e.confirmPassword = 'Confirma tu contraseña';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    if (!agreed)                        e.agreed  = 'Debes aceptar los términos';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const data = await fetchApi('/auth/register', { method: 'POST', body: { name: form.name, email: form.email, password: form.password } });
      login({ ...data.user, token: data.token });
      navigate('/dashboard');
    } catch (err) {
      setErrors({ general: err.message });
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
            <span className="leyebrow-dot"/> GRATIS · SIN TARJETA
          </div>
          <h1 className="display lbrandpanel-h1">
            Únete a la<br/>
            comunidad <em>pro</em>.
          </h1>
          <p className="lbrandpanel-lead">
            Miles de jugadores ya usan BrawlStats para mejorar su rendimiento
            y encontrar las mejores builds de la temporada.
          </p>

          <ul className="lfeatures">
            {FEATURES.map(({ Icon, label }) => (
              <li key={label}>
                <span className="lfeatures-ico"><Icon width="15" height="15"/></span>
                {label}
              </li>
            ))}
          </ul>

          <div className="lminstats">
            <div><span className="mono lminstats-val">12.8K</span><span className="lminstats-lbl">activos</span></div>
            <div><span className="mono lminstats-val">4.2M</span><span className="lminstats-lbl">partidas</span></div>
            <div><span className="mono lminstats-val">99.9%</span><span className="lminstats-lbl">uptime</span></div>
          </div>

          <div className="lmarquee" style={{ marginTop: 32 }} aria-hidden="true">
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
              <button type="button" className="lform-tab" onClick={() => navigate('/login')}>Iniciar sesión</button>
              <button type="button" className="lform-tab on">Crear cuenta</button>
              <span className="lform-tab-glide" style={{ transform: 'translateX(100%)' }}/>
            </div>

            <div className="lform-head">
              <h2 className="display">Empieza a competir.</h2>
              <p className="lform-sub">
                Crea una cuenta gratis. Sin tarjeta, sin spam, datos cifrados.
              </p>
            </div>

            <div className="lfield">
              <label>Nombre de jugador</label>
              <div className={'linput' + (errors.name ? ' is-error' : '')}>
                <LI.user width="16" height="16"/>
                <input type="text" placeholder="Tu nombre en el juego" value={form.name} {...field('name')} autoComplete="username"/>
              </div>
              {errors.name && <div className="lfield-error">{errors.name}</div>}
            </div>

            <div className="lfield">
              <label>Email</label>
              <div className={'linput' + (errors.email ? ' is-error' : '')}>
                <LI.mail width="16" height="16"/>
                <input type="email" placeholder="tu@email.com" value={form.email} {...field('email')} autoComplete="email"/>
              </div>
              {errors.email && <div className="lfield-error">{errors.email}</div>}
            </div>

            <div className="lfield">
              <label>Contraseña</label>
              <div className={'linput' + (errors.password ? ' is-error' : '')}>
                <LI.lock width="16" height="16"/>
                <input type={showPw ? 'text' : 'password'} placeholder="Mín. 8 caracteres, 1 letra y 1 número" value={form.password} {...field('password')} autoComplete="new-password"/>
                <button type="button" className="linput-eye" onClick={() => setShowPw(s => !s)} aria-label="Mostrar/ocultar contraseña">
                  {showPw ? <LI.eyeoff width="16" height="16"/> : <LI.eye width="16" height="16"/>}
                </button>
              </div>
              {form.password && (
                <div className="lpw-strength" data-strength={strength}>
                  <span/><span/><span/><span/>
                  <em>Fuerza: <b>{STRENGTH_LABEL[strength]}</b></em>
                </div>
              )}
              {errors.password && <div className="lfield-error">{errors.password}</div>}
            </div>

            <div className="lfield">
              <label>Confirmar contraseña</label>
              <div className={'linput' + (errors.confirmPassword ? ' is-error' : '')}>
                <LI.lock width="16" height="16"/>
                <input type={showCp ? 'text' : 'password'} placeholder="Repetir contraseña" value={form.confirmPassword} {...field('confirmPassword')} autoComplete="new-password"/>
                <button type="button" className="linput-eye" onClick={() => setShowCp(s => !s)} aria-label="Mostrar/ocultar confirmación">
                  {showCp ? <LI.eyeoff width="16" height="16"/> : <LI.eye width="16" height="16"/>}
                </button>
              </div>
              {errors.confirmPassword && <div className="lfield-error">{errors.confirmPassword}</div>}
            </div>

            <label className="lcheck">
              <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(ev => ({ ...ev, agreed: null })); }}/>
              <span className={'lcheck-box' + (errors.agreed ? ' is-error' : '')}><LI.check width="11" height="11"/></span>
              <span className="lcheck-lbl">
                Acepto los <a href="#" className="llink">términos</a> y la <a href="#" className="llink">privacidad</a>
              </span>
            </label>
            {errors.agreed && <div className="lfield-error" style={{ marginTop: -8 }}>{errors.agreed}</div>}

            {errors.general && <div className="alert alert-error">{errors.general}</div>}

            <button
              type="submit"
              className={'lbtn lbtn-primary' + (loading ? ' is-loading' : '')}
              disabled={loading}
            >
              <span>{loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}</span>
              {!loading && <LI.arrow width="16" height="16"/>}
            </button>

            <p className="lswitch">
              ¿Ya tienes cuenta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>
                Inicia sesión
              </a>
            </p>

          </form>
        </div>
      </main>

    </div>
  );
}
