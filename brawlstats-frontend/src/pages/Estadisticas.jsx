import { useState, useEffect, useCallback } from 'react';
import TrophyEvolutionChart from '../components/TrophyEvolutionChart';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import { modeColor } from '../utils/modeColors';

export default function Estadisticas() {
  const [player,    setPlayer]    = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [winRates,  setWinRates]  = useState([]);
  const [topBrawlers, setTopBrawlers] = useState([]);
  const [noPlayer,  setNoPlayer]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null); setNoPlayer(false);
    try {
      const p = await fetchApi('/players/me');
      setPlayer(p);
      const [logRes, ratesRes, favRes] = await Promise.allSettled([
        fetchApi('/stats/battlelog'),
        fetchApi('/stats/winrate?limit=100'),
        fetchApi('/stats/favorite-brawler'),
      ]);
      if (logRes.status   === 'fulfilled') setBattleLog(logRes.value   || []);
      if (ratesRes.status === 'fulfilled') setWinRates(ratesRes.value  || []);
      if (favRes.status   === 'fulfilled') setTopBrawlers(favRes.value?.top || []);
    } catch (err) {
      if (err.message && err.message.includes('vinculado')) setNoPlayer(true);
      else setError(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const brawlers   = [...(player?.rawData?.brawlers || [])].sort((a,b) => b.trophies - a.trophies);
  const brawlerIdByName = new Map(brawlers.map(b => [b.name.toLowerCase(), b.id]));
  const totalWins  = winRates.reduce((s, m) => s + m.wins,  0);
  const totalGames = winRates.reduce((s, m) => s + m.total, 0);
  const overallWR  = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const maxTrophies = brawlers[0]?.trophies || 1;

  if (loading) return (
    <Layout>
      <Topbar title="Estadisticas" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ color:'var(--color-text-muted)' }}>Cargando estadisticas...</p>
      </div>
    </Layout>
  );

  if (noPlayer) return (
    <Layout>
      <Topbar title="Estadisticas" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        <div className="card" style={{ textAlign:'center', padding:'4rem 2rem' }}>
          <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>📊</div>
          <h2 style={{ color:'var(--color-text)', marginBottom:'0.5rem' }}>Sin jugador vinculado</h2>
          <p style={{ color:'var(--color-text-muted)', marginBottom:'2rem' }}>
            Vincula tu cuenta de Brawl Stars para acceder a tus estadisticas.
          </p>
          <Link to="/mi-cuenta" className="btn btn-primary">Vincular cuenta</Link>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Topbar title={"Estadisticas - " + (player?.name || "")} />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#ef4444' }}>
            {error}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          <KpiCard label="Trofeos totales"  value={player?.trophies != null ? player.trophies.toLocaleString() : '-'} />
          <KpiCard label="Maximo historico" value={player?.highestTrophies != null ? player.highestTrophies.toLocaleString() : '-'} />
          <KpiCard label="Win Rate global"  value={overallWR + '%'} sub={totalWins + '/' + totalGames + ' partidas'} />
          <KpiCard label="Brawlers"         value={brawlers.length} />
        </div>

        <div style={{ marginBottom:'1.5rem' }}>
          <TrophyEvolutionChart title="Evolucion de trofeos · ultimos 30 dias" initialDays={30} />
        </div>

        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <h3 className="card-title">Top 3 brawlers por rendimiento</h3>
          {topBrawlers.length === 0
            ? <p style={{ color:'var(--color-text-muted)' }}>Sincroniza para acumular partidas y ver tus mejores brawlers.</p>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:'1rem' }}>
                {topBrawlers.map((b, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                  return (
                    <div key={b.name} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border, rgba(255,255,255,0.08))', borderRadius:'10px', padding:'1rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                        {b.brawlerId && (
                          <img
                            src={`https://cdn.brawlify.com/brawlers/borders/${b.brawlerId}.png`}
                            alt={b.name}
                            style={{ width:52, height:52, borderRadius:8, background:'var(--bg-elevated)', flexShrink:0 }}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <Link to={'/brawlers?search=' + encodeURIComponent(b.name)} style={{ fontSize:'1.1em', fontWeight:700, color:'var(--color-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</Link>
                            <span style={{ fontSize:'1.3em', flexShrink:0, marginLeft:6 }}>{medal}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem 0.75rem', fontSize:'0.85em' }}>
                        <div>
                          <div style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>Partidas</div>
                          <div style={{ fontFamily:'monospace', fontWeight:600 }}>{b.games}</div>
                        </div>
                        <div>
                          <div style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>Win Rate</div>
                          <div style={{ fontFamily:'monospace', fontWeight:600, color:'#22c55e' }}>{b.winRate}%</div>
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                          <div style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>Trofeos netos</div>
                          <div style={{ fontFamily:'monospace', fontWeight:600, color: b.trophyChange >= 0 ? '#22c55e' : '#ef4444' }}>
                            {b.trophyChange >= 0 ? '+' : ''}{b.trophyChange}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(380px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>
          <div className="card">
            <h3 className="card-title">Win Rate por Modo (ultimas 100)</h3>
            {winRates.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin partidas registradas.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {[...winRates].sort((a,b) => b.total - a.total).map((m,i) => {
                    const color = modeColor(m.mode);
                    return (
                      <div key={i}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'0.875em' }}>
                          <span style={{ color:'var(--color-text)' }}>{m.mode}</span>
                          <span style={{ color:'var(--color-gold)' }}>{m.winRate}% ({m.wins}/{m.total})</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: m.winRate + '%', background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          <div className="card">
            <h3 className="card-title">Ultimas partidas</h3>
            {battleLog.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>No hay partidas disponibles.</p>
              : (
                <table className="table">
                  <thead><tr><th>Modo</th><th>Brawler</th><th>Resultado</th><th>+/-</th></tr></thead>
                  <tbody>
                    {battleLog.slice(0,12).map((b,i) => {
                      const bid = brawlerIdByName.get((b.brawler || '').toLowerCase());
                      return (
                      <tr key={i}>
                        <td>
                          <div style={{ fontSize:'0.9em' }}>{b.modeLabel || b.mode}</div>
                          <div style={{ color:'var(--color-text-muted)', fontSize:'0.8em' }}>{b.map}</div>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {bid && (
                              <img
                                src={`https://cdn.brawlify.com/brawlers/borders/${bid}.png`}
                                alt={b.brawler}
                                style={{ width:28, height:28, borderRadius:4, background:'var(--bg-elevated)', flexShrink:0 }}
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <Link to={'/brawlers?search=' + encodeURIComponent(b.brawler)} style={{ color:'var(--color-text)', fontWeight:500 }}>
                              {b.brawler}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <span className={"badge " + (b.result === 'Win' ? 'badge-win' : b.result === 'Loss' ? 'badge-loss' : 'badge-default')}>
                            {b.result}
                          </span>
                        </td>
                        <td style={{ fontWeight:600, color: String(b.trophyChange).startsWith('+') ? '#22c55e' : '#ef4444' }}>
                          {b.trophyChange}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Coleccion completa de brawlers ({brawlers.length})</h3>
          {brawlers.length === 0
            ? <p style={{ color:'var(--color-text-muted)' }}>Sin datos de brawlers.</p>
            : (
              <div style={{ overflowX:'auto' }}>
                <table className="table">
                  <thead>
                    <tr><th>Brawler</th><th>Trofeos</th><th>Max</th><th>Power</th><th>Rank</th><th>Progreso</th></tr>
                  </thead>
                  <tbody>
                    {brawlers.map(b => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <img
                              src={`https://cdn.brawlify.com/brawlers/borders/${b.id}.png`}
                              alt={b.name}
                              style={{ width:36, height:36, borderRadius:6, background:'var(--bg-elevated)', flexShrink:0 }}
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                            <Link to={'/brawlers?search=' + encodeURIComponent(b.name)} style={{ color:'var(--color-text)', fontWeight:500 }}>
                              {b.name}
                            </Link>
                          </div>
                        </td>
                        <td style={{ color:'var(--color-gold)' }}>{b.trophies}</td>
                        <td style={{ color:'var(--color-text-muted)' }}>{b.highestTrophies}</td>
                        <td>
                          <span style={{ background:'rgba(250,204,21,0.15)', color:'var(--color-gold)', borderRadius:'4px', padding:'2px 8px', fontSize:'0.85em', fontWeight:600 }}>
                            P{b.power}
                          </span>
                        </td>
                        <td>{b.rank}</td>
                        <td style={{ minWidth:'120px' }}>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: Math.round((b.trophies / maxTrophies) * 100) + '%' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </Layout>
  );
}




