import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

const MAPS = [
  { name:'Double Swoosh',  mode:'Gem Grab',   env:'Gem Fort',    size:'Medio',   best:'Leon, Sandy' },
  { name:'Super Beach',    mode:'Brawl Ball', env:'Beachside',   size:'Grande',  best:'Amber, Frank' },
  { name:'Skull Creek',    mode:'Showdown',   env:'Wild West',   size:'Grande',  best:'Spike, Crow' },
  { name:'Open Business',  mode:'Hot Zone',   env:'Business',    size:'Medio',   best:'Buzz, Sandy' },
  { name:'Goldarm Gulch',  mode:'Knockout',   env:'Wild West',   size:'Pequeño', best:'Piper, Bea' },
  { name:'Pinball Dreams', mode:'Brawl Ball', env:'Stunt Show',  size:'Medio',   best:'Bibi, Bull' },
  { name:'Boundary Layer', mode:'Hot Zone',   env:'Mortis Tomb', size:'Pequeño', best:'Surge, Mortis' },
  { name:'Belle\'s Rock',  mode:'Knockout',   env:'Wild West',   size:'Medio',   best:'Belle, Piper' },
];

export function Mapas() {
  const [mode, setMode] = useState('Todos');
  const filtered = mode === 'Todos' ? MAPS : MAPS.filter(m => m.mode === mode);
  const modes = ['Todos', ...new Set(MAPS.map(m => m.mode))];

  return (
    <Layout>
      <Topbar title="Mapas" actions={<button className="btn btn-sm btn-secondary">Rotación actual</button>} />
      <div className="page">

        <div className="card mb-6">
          <div className="flex gap-2 flex-wrap">
            {modes.map(m => (
              <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div className="grid cols-4" style={{ gap: 'var(--s4)' }}>
          {filtered.map(map => (
            <div key={map.name} className="card" style={{ cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {/* Minimap placeholder */}
              <div style={{ height: 100, background: 'var(--bg-base)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 28 }}>
                ▦
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{map.name}</div>
              <span className="badge badge-info mt-2">{map.mode}</span>
              <div className="stat-row mt-3"><span className="stat-row-label">Entorno</span><span className="stat-row-value t-xs">{map.env}</span></div>
              <div className="stat-row"><span className="stat-row-label">Tamaño</span><span className="stat-row-value t-xs">{map.size}</span></div>
              <div className="stat-row"><span className="stat-row-label">Mejores</span><span className="stat-row-value t-xs text-success">{map.best}</span></div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}

const TUTORIALS = [
  { id:1, title:'Cómo usar Leon en Gem Grab', author:'ProBS',    views:'12.4K', duration:'8:32', level:'Avanzado',    tag:'Leon'    },
  { id:2, title:'Guía completa de Sandy',     author:'SandyPro', views:'9.1K',  duration:'12:15',level:'Intermedio',  tag:'Sandy'   },
  { id:3, title:'Meta actual Season 32',      author:'MetaGuru', views:'34.2K', duration:'18:40',level:'General',     tag:'Meta'    },
  { id:4, title:'Técnica de super de Spike',  author:'SpikeMX',  views:'7.8K',  duration:'5:20', level:'Avanzado',    tag:'Spike'   },
  { id:5, title:'Brawl Ball: estrategias',    author:'BB_King',  views:'21.3K', duration:'15:00',level:'Intermedio',  tag:'Modo'    },
  { id:6, title:'Cómo subir trofeos rápido',  author:'TroTrofer',views:'45.6K', duration:'22:10',level:'Principiante',tag:'Trofeos' },
];

export function Tutoriales() {
  const [search, setSearch] = useState('');
  const filtered = TUTORIALS.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <Topbar title="Tutoriales" actions={<button className="btn btn-sm btn-primary">+ Subir tutorial</button>} />
      <div className="page">

        <div className="card mb-6">
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="Buscar tutorial..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="grid cols-3" style={{ gap: 'var(--s4)' }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {/* Thumbnail placeholder */}
              <div style={{ height: 120, background: 'var(--bg-base)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 32 }}>▶</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--s2)' }}>{t.title}</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="badge badge-info">{t.tag}</span>
                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', fontSize: 9 }}>{t.level}</span>
              </div>
              <div className="stat-row"><span className="stat-row-label">Autor</span><span className="stat-row-value t-xs">{t.author}</span></div>
              <div className="stat-row"><span className="stat-row-label">Vistas</span><span className="stat-row-value t-xs">{t.views}</span></div>
              <div className="stat-row"><span className="stat-row-label">Duración</span><span className="stat-row-value t-xs">{t.duration}</span></div>
              <button className="btn btn-sm btn-primary mt-3 w-full">Ver tutorial</button>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}

const REPORTS = [
  { id:1, name:'Informe Mayo 2026',      date:'12/05/2026', type:'Jugador',  size:'248 KB', status:'Listo'   },
  { id:2, name:'Informe Abril 2026',     date:'30/04/2026', type:'Jugador',  size:'312 KB', status:'Listo'   },
  { id:3, name:'Análisis Meta S32',      date:'28/04/2026', type:'Meta',     size:'1.2 MB', status:'Listo'   },
  { id:4, name:'Reporte Club Speed Force',date:'20/04/2026',type:'Club',     size:'540 KB', status:'Listo'   },
  { id:5, name:'Informe Marzo 2026',     date:'31/03/2026', type:'Jugador',  size:'290 KB', status:'Listo'   },
];

export function Reportes() {
  const [generating, setGenerating] = useState(false);

  function generar() {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  }

  return (
    <Layout>
      <Topbar
        title="Reportes PDF"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary">Historial</button>
            <button className="btn btn-sm btn-primary" onClick={generar} disabled={generating}>
              {generating ? 'Generando...' : '+ Nuevo reporte'}
            </button>
          </div>
        }
      />
      <div className="page">

        {generating && <div className="alert alert-info mb-6">⏳ Generando reporte… esto puede tardar unos segundos.</div>}

        {/* Config nuevo reporte */}
        <div className="card mb-6">
          <div className="card-header"><span className="card-title">Configurar nuevo reporte</span></div>
          <div className="grid cols-3" style={{ gap: 'var(--s4)' }}>
            <div className="form-group">
              <label className="form-label">Tipo de reporte</label>
              <select className="form-select">
                <option>Reporte de jugador</option>
                <option>Análisis de meta</option>
                <option>Reporte de club</option>
                <option>Comparativa de brawlers</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Período</label>
              <select className="form-select">
                <option>Últimos 7 días</option>
                <option>Últimos 30 días</option>
                <option>Últimos 90 días</option>
                <option>Temporada actual</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Formato</label>
              <select className="form-select">
                <option>PDF</option>
                <option>CSV</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={generar} disabled={generating}>
            {generating ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>

        {/* Lista de reportes */}
        <div className="card">
          <div className="card-header"><span className="card-title">Reportes generados</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Nombre</th><th>Fecha</th><th>Tipo</th><th>Tamaño</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {REPORTS.map(r => (
                  <tr key={r.id}>
                    <td className="table-name">◎ {r.name}</td>
                    <td className="t-sm text-2" style={{ fontFamily: 'var(--font-mono)' }}>{r.date}</td>
                    <td><span className="badge badge-info">{r.type}</span></td>
                    <td className="t-sm text-2">{r.size}</td>
                    <td><span className="badge badge-win">{r.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-primary">Descargar</button>
                        <button className="btn btn-sm btn-secondary">Eliminar</button>
                      </div>
                    </td>
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

export default Mapas;
