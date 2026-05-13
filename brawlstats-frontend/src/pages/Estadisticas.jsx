import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';

const ROWS = [
  { rank:1, name:'Leon',  trophies:1840, games:312, wr:'74%', kd:3.2, rarity:'legendary', wrCls:'text-success' },
  { rank:2, name:'Sandy', trophies:1720, games:285, wr:'69%', kd:2.8, rarity:'legendary', wrCls:'text-success' },
  { rank:3, name:'Spike', trophies:1680, games:240, wr:'61%', kd:2.4, rarity:'legendary', wrCls:'text-warning' },
  { rank:4, name:'Amber', trophies:1520, games:198, wr:'66%', kd:2.9, rarity:'legendary', wrCls:'text-success' },
  { rank:5, name:'Crow',  trophies:1480, games:176, wr:'63%', kd:2.6, rarity:'legendary', wrCls:'text-success' },
];
const RK = {1:'rank-1',2:'rank-2',3:'rank-3'};

export default function Estadisticas() {
  const [range, setRange] = useState('30d');
  return (
    <Layout>
      <Topbar title="Estadísticas" actions={
        <div className="flex gap-2">
          {['7d','30d','90d'].map(r=>(
            <button key={r} className={`btn btn-sm ${range===r?'btn-primary':'btn-secondary'}`} onClick={()=>setRange(r)}>{r}</button>
          ))}
        </div>
      }/>
      <div className="page">
        <div className="grid cols-4 mb-6">
          <KpiCard label="Trofeos totales" value="47,820" delta="+1,240"  deltaType="up"   sub="últimos 30 días"      icon="🏆" color="blue"   />
          <KpiCard label="Win Rate"        value="64.3%"  delta="+2.1%"   deltaType="up"   sub="últimas 100 partidas" icon="📈" color="green"  />
          <KpiCard label="K/D Ratio"       value="2.4"    delta="+0.3"    deltaType="up"   sub="promedio global"      icon="⚔" color="yellow" />
          <KpiCard label="Partidas/día"    value="14.2"   delta="-2.1"    deltaType="down" sub="promedio 30 días"     icon="📊" color="red"    />
        </div>

        <div className="grid cols-3 mb-6" style={{ gap:'var(--s5)' }}>
          <div className="card" style={{ gridColumn:'span 2' }}>
            <div className="card-header"><div><div className="card-title">Evolución de trofeos</div><div className="t-sm text-3 mt-1" style={{ fontFamily:'var(--font-mono)' }}>Últimos 30 días · API Supercell</div></div></div>
            <div className="chart-sim">
              <div className="chart-grid-lines">{[...Array(5)].map((_,i)=><div key={i} className="chart-grid-line"/>)}</div>
              <div className="chart-y-labels">{['50K','48K','46K','44K','42K'].map(l=><span key={l} className="chart-y-label">{l}</span>)}</div>
              <div className="chart-area">
                <svg className="chart-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
                  <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,120 C60,110 120,105 180,95 C240,85 300,75 360,55 C420,40 480,28 540,20 L600,18 L600,160 L0,160 Z" fill="url(#g2)"/>
                  <path d="M0,120 C60,110 120,105 180,95 C240,85 300,75 360,55 C420,40 480,28 540,20 L600,18" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="600" cy="18" r="4" fill="#3B82F6"/>
                </svg>
              </div>
              <div className="chart-x-labels">{['1 Abr','8 Abr','15 Abr','22 Abr','Hoy'].map(l=><span key={l} className="chart-x-label">{l}</span>)}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Win rate por modo</span></div>
            {[{label:'Gem Grab',val:71,cls:'progress-green'},{label:'Brawl Ball',val:64,cls:'progress-blue'},{label:'Showdown',val:58,cls:'progress-yellow'},{label:'Hot Zone',val:49,cls:'progress-red'},{label:'Knockout',val:67,cls:'progress-green'},{label:'Bounty',val:55,cls:'progress-yellow'}].map(m=>(
              <div key={m.label} className="progress-wrap mb-4">
                <div className="progress-header"><span className="progress-label">{m.label}</span><span className="progress-value">{m.val}%</span></div>
                <div className="progress-bar-bg"><div className={`progress-bar-fill ${m.cls}`} style={{ width:`${m.val}%` }}/></div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid cols-2 mb-6" style={{ gap:'var(--s5)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Brawlers más usados (top 7)</span></div>
            <div className="bar-chart" style={{ height:140, alignItems:'flex-end', gap:'var(--s3)' }}>
              {[{name:'Leon',h:'90%',c:'var(--chart-1)'},{name:'Sandy',h:'75%',c:'var(--chart-2)'},{name:'Spike',h:'68%',c:'var(--chart-3)'},{name:'Amber',h:'52%',c:'var(--chart-4)'},{name:'Buzz',h:'45%',c:'var(--chart-5)'},{name:'Crow',h:'38%',c:'var(--chart-6)'},{name:'Mortis',h:'30%',c:'var(--chart-1)',op:0.6}].map(b=>(
                <div key={b.name} className="bar-group"><div className="bar" style={{ height:b.h, background:b.c, opacity:b.op||1 }}/><span className="bar-label">{b.name}</span></div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Estadísticas detalladas</span></div>
            {[['Partidas totales','4,218',''],['Victorias','2,712','text-success'],['Derrotas','1,506','text-error'],['Racha más larga','12 wins',''],['Brawler más usado','Leon','text-blue'],['Modo favorito','Gem Grab','text-blue'],['Trofeos máximos','49,200',''],['Tiempo jugado','312 h','']].map(([l,v,c])=>(
              <div key={l} className="stat-row"><span className="stat-row-label">{l}</span><span className={`stat-row-value ${c}`}>{v}</span></div>
            ))}
          </div>
        </div>

        <div className="t-label mb-4">▸ Rendimiento por brawler</div>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Estadísticas por brawler</div><div className="t-sm text-3 mt-1" style={{ fontFamily:'var(--font-mono)' }}>Ordenado por trofeos</div></div>
            <div className="flex gap-2">
              <select className="form-select btn-sm" style={{ width:'auto', padding:'5px 11px', fontSize:12 }}><option>Todos los modos</option><option>Gem Grab</option><option>Brawl Ball</option></select>
              <button className="btn btn-sm btn-secondary">Exportar</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th className="sorted">Brawler ↑</th><th>Trofeos</th><th>Partidas</th><th>Win Rate</th><th>K/D</th><th>Rareza</th></tr></thead>
              <tbody>
                {ROWS.map(r=>(
                  <tr key={r.name}>
                    <td className={`table-rank ${RK[r.rank]||''}`}>{r.rank}</td>
                    <td><div className="flex items-center gap-2"><div className="table-avatar"><span className="av-placeholder" style={{ fontSize:9 }}>img</span></div><div className="table-name">{r.name}</div></div></td>
                    <td className="table-num">{r.trophies.toLocaleString()}</td>
                    <td className="t-sm text-2">{r.games}</td>
                    <td><span className={r.wrCls} style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{r.wr}</span></td>
                    <td className="t-sm text-2">{r.kd}</td>
                    <td><span className={`badge badge-${r.rarity}`}>{r.rarity}</span></td>
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
