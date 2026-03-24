import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import fetchApi from '../services/api';
import { modeColor } from '../utils/modeColors';

const MODE_ICONS = {
  gemGrab:'💎', brawlBall:'⚽', showdown:'💀', soloShowdown:'💀', duoShowdown:'💀',
  hotZone:'🔥', knockout:'🥊', bounty:'⭐', heist:'💰', duels:'⚔️',
  wipeout:'💥', siege:'🏰', basketBrawl:'🏀',
};

const MODE_LABEL = {
  gemGrab:'Gem Grab', brawlBall:'Brawl Ball', showdown:'Showdown', soloShowdown:'Solo Showdown',
  duoShowdown:'Duo Showdown', hotZone:'Hot Zone', knockout:'Knockout', bounty:'Bounty',
  heist:'Heist', duels:'Duels', wipeout:'Wipeout', siege:'Siege', basketBrawl:'Basket Brawl',
};

export default function PlayerProfile() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchApi('/players/by-tag/' + encodeURIComponent(tag))
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [tag]);

  if (loading) return (
    <Layout>
      <Topbar title="Jugador" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ color:'var(--color-text-muted)' }}>Cargando perfil...</p>
      </div>
    </Layout>
  );

  if (error || !data?.player) return (
    <Layout>
      <Topbar title="Jugador" />
      <div style={{ padding:'1.5rem' }}>
        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔍</div>
          <h3 style={{ color:'var(--color-text)' }}>Jugador no encontrado</h3>
          <p style={{ color:'var(--color-text-muted)', marginBottom:'1.5rem' }}>{error || 'El tag #' + tag + ' no existe.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Volver</button>
        </div>
      </div>
    </Layout>
  );

  const p = data.player;
  const battles = data.battles || [];
  const brawlers = [...(p.brawlers || [])].sort((a,b) => b.trophies - a.trophies);

  // Distribucion por modo a partir de las ultimas partidas
  const modeStats = battles.reduce((acc, b) => {
    if (!b.mode) return acc;
    acc[b.mode] = acc[b.mode] || { count:0, wins:0 };
    acc[b.mode].count++;
    if (b.result === 'Win') acc[b.mode].wins++;
    return acc;
  }, {});
  const modes = Object.entries(modeStats)
    .map(([m, s]) => ({ mode:m, ...s, winRate: s.count > 0 ? Math.round((s.wins/s.count)*100) : 0 }))
    .sort((a,b) => b.count - a.count);

  const wins  = battles.filter(b => b.result === 'Win').length;
  const total = battles.length;
  const wr    = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <Layout>
      <Topbar title={"Jugador - " + p.name} actions={
        <button className="btn" onClick={() => navigate(-1)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)' }}>
          ← Volver
        </button>
      } />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>

        {/* Cabecera con nombre + tag + club */}
        <div className="card" style={{ marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
          <div style={{
            width:64, height:64, borderRadius:'12px',
            background:'linear-gradient(135deg, #f5a623, #f59e0b)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'2rem', fontWeight:800, color:'#0f1923',
          }}>
            {(p.name || '?').charAt(0)}
          </div>
          <div style={{ flex:1, minWidth:'200px' }}>
            <div style={{ fontSize:'1.6em', fontWeight:700, color:'var(--color-text)' }}>{p.name}</div>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginTop:'4px', fontSize:'0.85em' }}>
              <span style={{ color:'var(--color-gold)', fontFamily:'monospace' }}>{p.tag}</span>
              {p.club?.name && (
                <span style={{ color:'var(--color-text-muted)' }}>
                  Club: <span style={{ color:'var(--color-text)' }}>{p.club.name}</span>
                </span>
              )}
              <span style={{ color:'var(--color-text-muted)' }}>
                Nivel <span style={{ color:'var(--color-text)' }}>{p.expLevel ?? '-'}</span>
              </span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'0.7em', color:'var(--color-text-muted)', letterSpacing:'0.1em' }}>TROFEOS</div>
            <div style={{ fontSize:'1.8em', fontWeight:800, color:'var(--color-gold)', fontFamily:'monospace' }}>
              {(p.trophies ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPIs principales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          <KpiCard label="Trofeos actuales" value={(p.trophies ?? 0).toLocaleString()} />
          <KpiCard label="Maximo historico" value={(p.highestTrophies ?? 0).toLocaleString()} />
          <KpiCard label="Victorias 3v3"    value={(p['3vs3Victories'] ?? 0).toLocaleString()} />
          <KpiCard label="Victorias Solo"   value={(p.soloVictories ?? 0).toLocaleString()} />
          <KpiCard label="Victorias Duo"    value={(p.duoVictories ?? 0).toLocaleString()} />
          <KpiCard label={"Win Rate (" + total + " partidas)"} value={total > 0 ? wr + '%' : '-'} />
        </div>

        {/* Modos + brawlers favoritos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(380px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>

          <div className="card">
            <h3 className="card-title">Modos jugados (ultimas {total})</h3>
            {modes.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin partidas recientes disponibles.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {modes.map(m => {
                    const pct = total > 0 ? Math.round((m.count/total) * 100) : 0;
                    const color = modeColor(m.mode);
                    return (
                      <div key={m.mode}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'0.875em' }}>
                          <span style={{ color:'var(--color-text)' }}>
                            {MODE_ICONS[m.mode] || '🎮'} {MODE_LABEL[m.mode] || m.mode}
                          </span>
                          <span style={{ color:'var(--color-gold)', fontFamily:'monospace' }}>
                            {m.winRate}% · {m.count} ({pct}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: pct + '%', background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          <div className="card">
            <h3 className="card-title">Top 5 brawlers</h3>
            {brawlers.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin brawlers disponibles.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {brawlers.slice(0,5).map(b => (
                    <Link key={b.id} to={'/brawlers?search=' + encodeURIComponent(b.name)} style={{
                      display:'flex', alignItems:'center', gap:'0.75rem',
                      padding:'0.5rem 0.75rem', borderRadius:'8px',
                      background:'rgba(255,255,255,0.03)',
                      border:'1px solid rgba(255,255,255,0.05)',
                    }}>
                      <img
                        src={'https://cdn.brawlify.com/brawlers/borders/' + b.id + '.png'}
                        alt={b.name} width={36} height={36}
                        onError={e => e.currentTarget.style.visibility = 'hidden'}
                      />
                      <div style={{ flex:1 }}>
                        <div style={{ color:'var(--color-text)', fontWeight:600, fontSize:'0.9em' }}>{b.name}</div>
                        <div style={{ color:'var(--color-text-muted)', fontSize:'0.75em' }}>
                          Power {b.power} · Rank {b.rank}
                        </div>
                      </div>
                      <div style={{ color:'var(--color-gold)', fontWeight:600, fontFamily:'monospace' }}>
                        {b.trophies}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Ultimas batallas */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <h3 className="card-title">Ultimas partidas</h3>
          {battles.length === 0
            ? <p style={{ color:'var(--color-text-muted)' }}>No hay partidas recientes disponibles.</p>
            : (
              <table className="table">
                <thead>
                  <tr><th>Modo / Mapa</th><th>Brawler</th><th>Resultado</th><th>+/-</th><th>Cuando</th></tr>
                </thead>
                <tbody>
                  {battles.slice(0,15).map((b,i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight:500 }}>
                          {MODE_ICONS[b.mode] || '🎮'} {MODE_LABEL[b.mode] || b.mode}
                        </div>
                        <div style={{ color:'var(--color-text-muted)', fontSize:'0.8em' }}>{b.map || '-'}</div>
                      </td>
                      <td>
                        {b.brawler
                          ? <Link to={'/brawlers?search=' + encodeURIComponent(b.brawler)} style={{ color:'var(--color-text)', fontWeight:500 }}>{b.brawler}</Link>
                          : <span style={{ color:'var(--color-text-muted)' }}>-</span>}
                      </td>
                      <td>
                        <span className={"badge " + (b.result === 'Win' ? 'badge-win' : b.result === 'Loss' ? 'badge-loss' : 'badge-default')}>
                          {b.result}{b.rank ? ' #' + b.rank : ''}
                        </span>
                      </td>
                      <td style={{ fontWeight:600, color: b.trophyChange > 0 ? '#22c55e' : b.trophyChange < 0 ? '#ef4444' : 'var(--color-text-muted)', fontFamily:'monospace' }}>
                        {b.trophyChange > 0 ? '+' + b.trophyChange : b.trophyChange}
                      </td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.8em' }}>
                        {b.battleAt ? new Date(b.battleAt).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Coleccion completa */}
        <div className="card">
          <h3 className="card-title">Coleccion de brawlers ({brawlers.length})</h3>
          {brawlers.length === 0
            ? <p style={{ color:'var(--color-text-muted)' }}>Sin brawlers desbloqueados.</p>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
                {brawlers.map(b => (
                  <div key={b.id} style={{
                    background:'rgba(255,255,255,0.03)',
                    border:'1px solid rgba(255,255,255,0.05)',
                    borderRadius:'10px', padding:'0.75rem',
                    display:'flex', alignItems:'center', gap:'0.75rem',
                  }}>
                    <img
                      src={'https://cdn.brawlify.com/brawlers/borders/' + b.id + '.png'}
                      alt={b.name} width={42} height={42}
                      onError={e => e.currentTarget.style.visibility = 'hidden'}
                    />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'var(--color-text)', fontWeight:600, fontSize:'0.85em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {b.name}
                      </div>
                      <div style={{ display:'flex', gap:'6px', marginTop:'2px' }}>
                        <span style={{ fontSize:'0.7em', color:'var(--color-gold)', fontFamily:'monospace', fontWeight:600 }}>
                          {b.trophies}
                        </span>
                        <span style={{ fontSize:'0.7em', color:'var(--color-text-muted)' }}>·</span>
                        <span style={{ fontSize:'0.7em', color:'var(--color-text-muted)', fontFamily:'monospace' }}>
                          P{b.power} R{b.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

      </div>
    </Layout>
  );
}
