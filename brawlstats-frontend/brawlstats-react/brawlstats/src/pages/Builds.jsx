import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

const BUILDS = [
  { id:1, brawler:'Leon',   mode:'Gem Grab',   gadget:'Clone Projector', star:'Smoke Trails',   desc:'Máxima movilidad para robar gemas.', rating:4.8, votes:1240 },
  { id:2, brawler:'Sandy',  mode:'Gem Grab',   gadget:'Sleep Stimulator',star:'Rude Sands',     desc:'Control de zona con arenisca persistente.', rating:4.6, votes:980 },
  { id:3, brawler:'Spike',  mode:'Hot Zone',   gadget:'Popping Pincushion',star:'Fertilize',    desc:'Dominio total del hot zone.', rating:4.5, votes:870 },
  { id:4, brawler:'Amber',  mode:'Brawl Ball', gadget:'Wild Flames',     star:'Fuel Injectors', desc:'Presión constante con fuego en la portería.', rating:4.3, votes:650 },
  { id:5, brawler:'Crow',   mode:'Knockout',   gadget:'Defense Booster', star:'Extra Toxic',    desc:'Envenenamiento masivo en zonas cerradas.', rating:4.2, votes:540 },
  { id:6, brawler:'Buzz',   mode:'Hot Zone',   gadget:'Tougher Torpedo', star:'Bumper Car',     desc:'Tank de zona con gran presencia.', rating:4.0, votes:430 },
];

export default function Builds() {
  const [search, setSearch] = useState('');
  const filtered = BUILDS.filter(b =>
    b.brawler.toLowerCase().includes(search.toLowerCase()) ||
    b.mode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <Topbar
        title="Builds"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary">Filtrar</button>
            <button className="btn btn-sm btn-primary">+ Nueva build</button>
          </div>
        }
      />
      <div className="page">

        <div className="card mb-6">
          <div className="flex gap-3 items-center">
            <input className="form-input" style={{ maxWidth: 280 }} placeholder="Buscar brawler o modo..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select" style={{ width: 'auto', padding: '8px 14px' }}>
              <option>Todos los modos</option><option>Gem Grab</option><option>Brawl Ball</option><option>Showdown</option><option>Hot Zone</option><option>Knockout</option>
            </select>
            <select className="form-select" style={{ width: 'auto', padding: '8px 14px' }}>
              <option>Todas las rarezas</option><option>Legendary</option><option>Epic</option><option>Mythic</option>
            </select>
          </div>
        </div>

        <div className="grid cols-3" style={{ gap: 'var(--s5)' }}>
          {filtered.map(b => (
            <div key={b.id} className="card" style={{ cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue-border)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div className="card-header">
                <div>
                  <div className="card-title">{b.brawler}</div>
                  <span className="badge badge-info">{b.mode}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--yellow)' }}>
                  ★ {b.rating}
                </div>
              </div>
              <div className="stat-row mt-2"><span className="stat-row-label">Gadget</span><span className="stat-row-value t-sm">{b.gadget}</span></div>
              <div className="stat-row"><span className="stat-row-label">Star Power</span><span className="stat-row-value t-sm">{b.star}</span></div>
              <p className="t-sm text-3 mt-3">{b.desc}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="t-xs text-3">{b.votes.toLocaleString()} votos</span>
                <button className="btn btn-sm btn-primary">Ver build</button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}
