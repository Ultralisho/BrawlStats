import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import { useAuth } from '../App';

export default function MiCuenta() {
  const { user, login } = useAuth();
  const [tag, setTag] = useState('');
  const [tagFound, setTagFound] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', country: 'España', lang: 'Español' });

  function buscarTag() {
    if (tag.trim()) setTagFound(true);
  }

  function guardar(e) {
    e.preventDefault();
    login({ ...user, ...form });
  }

  const recentMatches = [
    { mode: 'Gem Grab',   brawler: 'Leon',  map: 'Double Swoosh', trophies: '+8', result: 'Win',  time: '5 min' },
    { mode: 'Brawl Ball', brawler: 'Sandy', map: 'Super Beach',   trophies: '+7', result: 'Win',  time: '18 min' },
    { mode: 'Showdown',   brawler: 'Spike', map: 'Skull Creek',   trophies: '-4', result: 'Loss', time: '32 min' },
    { mode: 'Hot Zone',   brawler: 'Amber', map: 'Open Business', trophies: '+0', result: 'Draw', time: '45 min' },
    { mode: 'Knockout',   brawler: 'Crow',  map: 'Goldarm Gulch', trophies: '+9', result: 'Win',  time: '1 h' },
  ];

  return (
    <Layout>
      <Topbar
        title="Mi Cuenta"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary">Sincronizar</button>
            <button className="btn btn-sm btn-primary">+ Nuevo reporte</button>
          </div>
        }
      />
      <div className="page">

        {/* Perfil hero */}
        <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)', borderColor: 'var(--blue-border)' }}>
          <div className="flex items-center gap-6">
            <div style={{ width: 80, height: 80, borderRadius: 'var(--r-xl)', background: 'var(--blue-dim)', border: '2px solid var(--blue-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--blue)', flexShrink: 0 }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>{user?.name || 'Ulises H.'}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{user?.tag || '#2PPU8QLYL'}</div>
              <div className="flex gap-2 mt-2">
                <span className="badge badge-info">España 🇪🇸</span>
                <span className="badge badge-legendary">Rank Maestro</span>
                <span className="badge badge-win">Online</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-secondary">Editar perfil</button>
              <button className="btn btn-primary">Vincular cuenta</button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid cols-4 mb-6">
          <KpiCard label="Trofeos totales" value="47,820" delta="+1,240"  deltaType="up"      sub="vs. semana anterior"     icon="🏆" color="blue"   />
          <KpiCard label="Win Rate"        value="64.3%"  delta="+2.1%"   deltaType="up"      sub="últimas 100 partidas"    icon="📈" color="green"  />
          <KpiCard label="Nivel de cuenta" value="412"    delta="+8"      deltaType="up"      sub="puntos de experiencia"   icon="⭐" color="yellow" />
          <KpiCard label="Club"            value="Speed Force" delta="Miembro" deltaType="neutral" sub="Liga Oro III"       icon="🎯" color="red"    />
        </div>

        <div className="grid cols-2-1 mb-6" style={{ gap: 'var(--s5)' }}>

          {/* Formulario */}
          <div className="card">
            <div className="card-header"><span className="card-title">Buscar y vincular jugador</span></div>
            <div className="form-group">
              <label className="form-label">Tag de jugador Brawl Stars</label>
              <div className="flex gap-2">
                <input type="text" className="form-input" placeholder="#2PPU8QLYL" value={tag} onChange={e => setTag(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={buscarTag}>Buscar</button>
              </div>
              <div className="form-help">El tag se encuentra en tu perfil dentro del juego</div>
            </div>
            {tagFound && <div className="alert alert-success">✓ Jugador encontrado — Ulises H. · 47,820 trofeos</div>}

            <hr className="divider" />

            <div className="card-header" style={{ marginBottom: 'var(--s3)' }}>
              <span className="card-title">Datos personales</span>
            </div>
            <form onSubmit={guardar}>
              <div className="grid cols-2" style={{ gap: 'var(--s4)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de usuario</label>
                  <input type="text" className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input is-success" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">País</label>
                  <select className="form-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                    <option>España</option><option>México</option><option>Argentina</option><option>Colombia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Idioma</label>
                  <select className="form-select" value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}>
                    <option>Español</option><option>English</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Guardar cambios</button>
            </form>
          </div>

          {/* Stats rápidas + seguridad */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-header"><span className="card-title">Resumen rápido</span></div>
              {[['Partidas totales','4,218'],['Victorias','2,712'],['Derrotas','1,506'],['Racha actual','+7'],['Brawlers','78 / 102'],['Skins','34']].map(([l,v]) => (
                <div key={l} className="stat-row"><span className="stat-row-label">{l}</span><span className="stat-row-value">{v}</span></div>
              ))}
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Seguridad</span></div>
              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <input type="password" className="form-input" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input type="password" className="form-input" placeholder="Mínimo 8 caracteres" />
                <div className="form-help">Letras, números y símbolos</div>
              </div>
              <button className="btn btn-secondary w-full">Cambiar contraseña</button>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="t-label mb-4">▸ Últimas partidas</div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Historial reciente</div>
              <div className="t-sm text-3 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>Últimas 10 partidas · Sincronizado hace 3 min</div>
            </div>
            <button className="btn btn-sm btn-secondary">Ver todo</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Modo</th><th>Brawler</th><th>Mapa</th><th>Trofeos</th><th>Resultado</th><th>Hace</th></tr>
              </thead>
              <tbody>
                {recentMatches.map((m, i) => (
                  <tr key={i}>
                    <td className="t-sm">{m.mode}</td>
                    <td><div className="flex items-center gap-2"><div className="table-avatar"><span className="av-placeholder" style={{ fontSize: 9 }}>img</span></div><span className="t-sm">{m.brawler}</span></div></td>
                    <td className="t-sm text-2">{m.map}</td>
                    <td className={`table-num ${m.result === 'Win' ? 'text-success' : m.result === 'Loss' ? 'text-error' : 'text-warning'}`}>{m.trophies}</td>
                    <td><span className={`badge badge-${m.result === 'Win' ? 'win' : m.result === 'Loss' ? 'loss' : 'draw'}`}>{m.result}</span></td>
                    <td className="t-sm text-3">{m.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}
