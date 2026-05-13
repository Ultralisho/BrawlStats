import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';

const PLAYERS = [
  { rank: 1,    name: 'Eloxitaa',       tag: '#LP2PPU',    trophies: 266174, wr: '72.4%', wrCls: 'text-success', games: 9214,  fav: 'Leon',  mode: 'Gem Grab',   club: 'A Few Good Men', country: '🇪🇸 ES', status: 'Win'  },
  { rank: 2,    name: 'prostislavv',     tag: '#ROST22',    trophies: 239652, wr: '69.8%', wrCls: 'text-success', games: 8890,  fav: 'Spike', mode: 'Brawl Ball', club: 'Rost Aura',      country: '🇷🇺 RU', status: 'Loss' },
  { rank: 3,    name: 'Netty',           tag: '#YETI01',    trophies: 233709, wr: '61.2%', wrCls: 'text-warning', games: 7410,  fav: 'Sandy', mode: 'Showdown',   club: 'YETI',           country: '🇺🇸 US', status: 'Draw' },
  { rank: 4,    name: '【火|Ties🌿】',   tag: '#YETI02',    trophies: 232392, wr: '66.5%', wrCls: 'text-success', games: 6980,  fav: 'Amber', mode: 'Hot Zone',   club: 'YETI',           country: '🇨🇳 CN', status: 'Win'  },
  { rank: 5,    name: 'SpeedRun_CN',     tag: '#FAST99',    trophies: 229100, wr: '48.3%', wrCls: 'text-error',   games: 14200, fav: 'Buzz',  mode: 'Knockout',   club: 'Speed Force',    country: '🇨🇳 CN', status: 'Offline' },
];

const RANK_CLS = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' };
const STATUS_CLS = { Win: 'badge-win', Loss: 'badge-loss', Draw: 'badge-draw', Offline: 'badge-default' };

export default function Leaderboards() {
  const [scope, setScope] = useState('Global');

  return (
    <Layout>
      <Topbar
        title="Leaderboards"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary">Sincronizar</button>
            <button className="btn btn-sm btn-primary">Exportar CSV</button>
          </div>
        }
      />
      <div className="page">

        <div className="grid cols-4 mb-6">
          <KpiCard label="Jugadores rankeados" value="12,840" delta="+320"      deltaType="up"      sub="esta semana"          icon="▲" color="blue"   />
          <KpiCard label="Top trofeos"         value="266,174" delta="sin cambios" deltaType="neutral" sub="Eloxitaa · #LP2PPU" icon="🏆" color="green"  />
          <KpiCard label="Mayor win rate"      value="74.1%"  delta="+0.3%"     deltaType="up"      sub="Top 1 España"         icon="📈" color="yellow" />
          <KpiCard label="Tu posición"         value="#1,204" delta="+88"       deltaType="up"      sub="en España"            icon="🎯" color="red"    />
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-2">
              {['Global','España','Amigos'].map(s => (
                <button key={s} className={`btn btn-sm ${scope === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setScope(s)}>{s}</button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <span className="t-label">Filtrar por:</span>
              <select className="form-select" style={{ width: 'auto', padding: '5px 12px', fontSize: 12 }}>
                <option>Todos los modos</option><option>Gem Grab</option><option>Brawl Ball</option><option>Showdown</option><option>Hot Zone</option><option>Knockout</option>
              </select>
              <select className="form-select" style={{ width: 'auto', padding: '5px 12px', fontSize: 12 }}>
                <option>Todas las rarezas</option><option>Legendary</option><option>Epic</option><option>Super Rare</option>
              </select>
              <span className="badge badge-info">Live</span>
              <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>Actualizado hace 2 min</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th className="sorted">Jugador ↑</th><th>Trofeos</th><th>Win Rate</th>
                  <th>Partidas</th><th>Brawler fav.</th><th>Modo fav.</th><th>Club</th><th>País</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map(p => (
                  <tr key={p.tag}>
                    <td className={`table-rank ${RANK_CLS[p.rank] || ''}`}>{p.rank}</td>
                    <td>
                      <div className="table-player">
                        <div className="table-avatar"><span className="av-placeholder">{p.name[0]}</span></div>
                        <div><div className="table-name">{p.name}</div><div className="table-tag">{p.tag}</div></div>
                      </div>
                    </td>
                    <td className="table-num">{p.trophies.toLocaleString()}</td>
                    <td><span className={p.wrCls} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.wr}</span></td>
                    <td className="table-num">{p.games.toLocaleString()}</td>
                    <td className="t-sm">{p.fav}</td>
                    <td><span className="badge badge-info">{p.mode}</span></td>
                    <td className="t-sm text-2">{p.club}</td>
                    <td className="t-sm text-2">{p.country}</td>
                    <td><span className={`badge ${STATUS_CLS[p.status]}`}>{p.status}</span></td>
                  </tr>
                ))}
                {/* Fila del usuario actual */}
                <tr style={{ background: 'rgba(59,130,246,0.04)', borderLeft: '2px solid var(--blue)' }}>
                  <td className="table-rank" style={{ color: 'var(--blue)' }}>1,204</td>
                  <td>
                    <div className="table-player">
                      <div className="table-avatar" style={{ borderColor: 'var(--blue-border)', background: 'var(--blue-dim)' }}>
                        <span className="av-placeholder" style={{ color: 'var(--blue)' }}>U</span>
                      </div>
                      <div>
                        <div className="table-name" style={{ color: 'var(--blue)' }}>Ulises H. <span className="badge badge-info" style={{ fontSize: 9, padding: '1px 5px' }}>Tú</span></div>
                        <div className="table-tag">#2PPU8QLYL</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-num">47,820</td>
                  <td><span className="text-success" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>64.3%</span></td>
                  <td className="table-num">4,218</td>
                  <td className="t-sm">Leon</td>
                  <td><span className="badge badge-info">Gem Grab</span></td>
                  <td className="t-sm text-2">—</td>
                  <td className="t-sm text-2">🇪🇸 ES</td>
                  <td><span className="badge badge-win">Win</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="t-sm text-3" style={{ fontFamily: 'var(--font-mono)' }}>Mostrando 1–5 de 12,840</span>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-secondary" disabled>← Anterior</button>
              <button className="btn btn-sm btn-primary">1</button>
              <button className="btn btn-sm btn-secondary">2</button>
              <button className="btn btn-sm btn-secondary">3</button>
              <span className="t-sm text-3" style={{ padding: '5px 4px' }}>…</span>
              <button className="btn btn-sm btn-secondary">1,284</button>
              <button className="btn btn-sm btn-secondary">Siguiente →</button>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
