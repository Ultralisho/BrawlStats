import React from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import { useAuth } from '../App';

const MATCHES = [
  { mode:'Gem Grab',   brawler:'Leon',  trophies:'+8', result:'Win'  },
  { mode:'Brawl Ball', brawler:'Sandy', trophies:'+7', result:'Win'  },
  { mode:'Showdown',   brawler:'Spike', trophies:'-4', result:'Loss' },
  { mode:'Hot Zone',   brawler:'Amber', trophies:'+0', result:'Draw' },
  { mode:'Knockout',   brawler:'Crow',  trophies:'+9', result:'Win'  },
];

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Layout>
      <Topbar title="Dashboard" actions={
        <div className="flex gap-2">
          <div className="api-status"><div className="api-dot online"></div> API online</div>
          <button className="btn btn-sm btn-secondary">Sincronizar</button>
        </div>
      }/>
      <div className="page">
        <div className="card mb-6" style={{ background:'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)', borderColor:'var(--blue-border)' }}>
          <div className="flex items-center gap-4">
            <div style={{ width:56, height:56, borderRadius:'var(--r-xl)', background:'var(--blue-dim)', border:'2px solid var(--blue-border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--blue)', flexShrink:0 }}>
              {(user?.name||'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800 }}>Bienvenido, {user?.name||'jugador'} 👋</div>
              <div className="t-sm text-3 mt-1" style={{ fontFamily:'var(--font-mono)' }}>{user?.tag||'#———'} · Última sync hace 3 min</div>
            </div>
            <div className="flex gap-2" style={{ marginLeft:'auto' }}>
              <span className="badge badge-win">Online</span>
              <span className="badge badge-legendary">Rank Maestro</span>
            </div>
          </div>
        </div>

        <div className="grid cols-4 mb-6">
          <KpiCard label="Trofeos totales" value="47,820" delta="+1,240"  deltaType="up"   sub="últimos 30 días"      icon="🏆" color="blue"   />
          <KpiCard label="Win Rate"        value="64.3%"  delta="+2.1%"   deltaType="up"   sub="últimas 100 partidas" icon="📈" color="green"  />
          <KpiCard label="K/D Ratio"       value="2.4"    delta="+0.3"    deltaType="up"   sub="promedio global"      icon="⚔" color="yellow" />
          <KpiCard label="Partidas/día"    value="14.2"   delta="-2.1"    deltaType="down" sub="promedio 30 días"     icon="📊" color="red"    />
        </div>

        <div className="grid cols-3 mb-6" style={{ gap:'var(--s5)' }}>
          <div className="card" style={{ gridColumn:'span 2' }}>
            <div className="card-header">
              <div><div className="card-title">Evolución de trofeos</div><div className="t-sm text-3 mt-1" style={{ fontFamily:'var(--font-mono)' }}>Últimos 30 días</div></div>
            </div>
            <div className="chart-sim">
              <div className="chart-grid-lines">{[...Array(5)].map((_,i)=><div key={i} className="chart-grid-line"/>)}</div>
              <div className="chart-y-labels">{['50K','48K','46K','44K','42K'].map(l=><span key={l} className="chart-y-label">{l}</span>)}</div>
              <div className="chart-area">
                <svg className="chart-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,120 C60,110 120,105 180,95 C240,85 300,75 360,55 C420,40 480,28 540,20 L600,18 L600,160 L0,160 Z" fill="url(#g1)"/>
                  <path d="M0,120 C60,110 120,105 180,95 C240,85 300,75 360,55 C420,40 480,28 540,20 L600,18" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="600" cy="18" r="4" fill="#3B82F6"/>
                </svg>
              </div>
              <div className="chart-x-labels">{['1 Abr','8 Abr','15 Abr','22 Abr','Hoy'].map(l=><span key={l} className="chart-x-label">{l}</span>)}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Últimas partidas</span></div>
            {MATCHES.map((m,i)=>(
              <div key={i} className="stat-row">
                <div><div className="t-sm" style={{ fontWeight:600 }}>{m.brawler}</div><div className="t-xs text-3">{m.mode}</div></div>
                <div className="flex items-center gap-2">
                  <span className={`table-num ${m.result==='Win'?'text-success':m.result==='Loss'?'text-error':'text-warning'}`}>{m.trophies}</span>
                  <span className={`badge badge-${m.result==='Win'?'win':m.result==='Loss'?'loss':'draw'}`}>{m.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid cols-2" style={{ gap:'var(--s5)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Estadísticas rápidas</span></div>
            {[['Partidas totales','4,218'],['Victorias','2,712'],['Derrotas','1,506'],['Racha más larga','12 wins'],['Brawler más usado','Leon'],['Modo favorito','Gem Grab'],['Trofeos máximos','49,200'],['Tiempo jugado','312 h']].map(([l,v])=>(
              <div key={l} className="stat-row"><span className="stat-row-label">{l}</span><span className="stat-row-value">{v}</span></div>
            ))}
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
      </div>
    </Layout>
  );
}
