import { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import TrophyEvolutionChart from '../components/TrophyEvolutionChart';
import { modeColor } from '../utils/modeColors';

export default function Dashboard() {
  const navigate = useNavigate();
  const [player,    setPlayer]    = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [winRates,  setWinRates]  = useState([]);
  const [streak,    setStreak]    = useState(null);
  const [modeDist,  setModeDist]  = useState(null);
  const [favorite,  setFavorite]  = useState(null);
  const [noPlayer,  setNoPlayer]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [syncing,   setSyncing]   = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null); setNoPlayer(false);
    try {
      const p = await fetchApi('/players/me');
      setPlayer(p);
      const [logRes, ratesRes, streakRes, distRes, favRes] = await Promise.allSettled([
        fetchApi('/stats/battlelog'),
        fetchApi('/stats/winrate?limit=100'),
        fetchApi('/stats/streak'),
        fetchApi('/stats/mode-distribution'),
        fetchApi('/stats/favorite-brawler'),
      ]);
      if (logRes.status    === 'fulfilled') setBattleLog(logRes.value    || []);
      if (ratesRes.status  === 'fulfilled') setWinRates(ratesRes.value   || []);
      if (streakRes.status === 'fulfilled') setStreak(streakRes.value    || null);
      if (distRes.status   === 'fulfilled') setModeDist(distRes.value    || null);
      if (favRes.status    === 'fulfilled') setFavorite(favRes.value     || null);
    } catch (err) {
      if (err.message && err.message.includes('vinculado')) setNoPlayer(true);
      else setError(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try { await fetchApi('/players/sync', { method: 'POST' }); await loadData(); }
    catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  };

  const totalWins  = winRates.reduce((s, m) => s + m.wins,  0);
  const totalGames = winRates.reduce((s, m) => s + m.total, 0);
  const overallWR  = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const brawlers   = [...(player?.rawData?.brawlers || [])].sort((a,b) => b.trophies - a.trophies).slice(0, 12);

  if (loading) return (
    <Layout>
      <Topbar title="Dashboard" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ color:'var(--color-text-muted)' }}>Cargando datos...</p>
      </div>
    </Layout>
  );

  if (noPlayer) return (
    <Layout>
      <Topbar title="Dashboard" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        <div className="card" style={{ textAlign:'center', padding:'4rem 2rem' }}>
          <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>🎮</div>
          <h2 style={{ color:'var(--color-text)', marginBottom:'0.5rem' }}>Sin jugador vinculado</h2>
          <p style={{ color:'var(--color-text-muted)', marginBottom:'2rem' }}>
            Vincula tu cuenta de Brawl Stars para ver tus estadisticas en tiempo real.
          </p>
          <Link to="/mi-cuenta" className="btn btn-primary">Vincular cuenta</Link>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Topbar title={"Dashboard - " + (player?.name || "")} actions={
        <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      } />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#ef4444' }}>
            {error}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          <KpiCard label="Trofeos"     value={player?.trophies != null ? player.trophies.toLocaleString() : '-'} />
          <KpiCard label="Max Trofeos" value={player?.highestTrophies != null ? player.highestTrophies.toLocaleString() : '-'} />
          <KpiCard label="Nivel"       value={player?.level ?? '-'} />
          <KpiCard label="Win Rate"    value={overallWR + '%'} sub={totalWins + ' / ' + totalGames + ' partidas'} />
        </div>

        <div style={{ marginBottom:'1.5rem' }}>
          <TrophyEvolutionChart title="Evolucion de trofeos · ultimos 30 dias" initialDays={30} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>
          <div className="card">
            <h3 className="card-title">Racha actual</h3>
            <StreakWidget streak={streak} />
          </div>
          <div className="card">
            <h3 className="card-title">Brawler favorito</h3>
            <FavoriteWidget favorite={favorite} />
          </div>
          <div className="card">
            <h3 className="card-title">Modos jugados</h3>
            <ModeDistribution data={modeDist} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(380px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>
          <div className="card">
            <h3 className="card-title">Ultimas partidas</h3>
            {battleLog.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>No hay partidas disponibles.</p>
              : (
                <table className="table">
                  <thead><tr><th>Modo / Mapa</th><th>Brawler</th><th>Resultado</th><th>Trofeos</th></tr></thead>
                  <tbody>
                    {battleLog.slice(0,10).map((b,i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight:500 }}>{b.mode}</div>
                          <div style={{ color:'var(--color-text-muted)', fontSize:'0.8em' }}>{b.map}</div>
                        </td>
                        <td>
                          <Link to={'/brawlers?search=' + encodeURIComponent(b.brawler)} style={{ color:'var(--color-text)', fontWeight:500 }}>
                            {b.brawler}
                          </Link>
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
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>

          <div className="card">
            <h3 className="card-title">Win Rate por Modo (ultimas 100)</h3>
            {winRates.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin datos de partidas.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {[...winRates].sort((a,b) => b.total - a.total).map((m,i) => {
                    const color = modeColor(m.mode);
                    return (
                      <div key={i}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'0.875em' }}>
                          <span style={{ color:'var(--color-text)' }}>{m.mode}</span>
                          <span style={{ color:'var(--color-gold)' }}>
                            {m.winRate}% ({m.wins}/{m.total})
                          </span>
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
        </div>

        {brawlers.length > 0 && (
          <div className="card">
            <h3 className="card-title">Mis Brawlers - Top 12</h3>
            <div className="brawler-grid">
              {brawlers.map(b => (
                <div key={b.id} className="brawler-card" style={{ cursor:'pointer' }} onClick={() => navigate('/brawlers?search=' + encodeURIComponent(b.name))}>
                  <div className="brawler-name">{b.name}</div>
                  <div className="brawler-trophies">{b.trophies} trofeos</div>
                  <div style={{ fontSize:'0.75em', color:'var(--color-text-muted)', marginTop:'4px' }}>
                    Power {b.power} - Rank {b.rank}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginTop:'1rem' }}>
          {player?.club && (
            <div className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', flex:1, minWidth:'200px' }}>
              <div>
                <div style={{ color:'var(--color-text-muted)', fontSize:'0.75em' }}>CLUB</div>
                <div style={{ color:'var(--color-text)', fontWeight:600 }}>{player.club}</div>
              </div>
            </div>
          )}
          <div className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', flex:1, minWidth:'200px' }}>
            <div>
              <div style={{ color:'var(--color-text-muted)', fontSize:'0.75em' }}>TAG</div>
              <div style={{ color:'var(--color-gold)', fontWeight:600, fontFamily:'monospace' }}>{player?.tag}</div>
            </div>
          </div>
        </div>

        {player?.lastSync && (
          <p style={{ color:'var(--color-text-muted)', fontSize:'0.75em', textAlign:'right', marginTop:'0.5rem' }}>
            Ultima sync: {new Date(player.lastSync).toLocaleString('es-ES')}
          </p>
        )}
      </div>
    </Layout>
  );
}

/* ── Widgets ──────────────────────────────────────────────────────────── */

function StreakWidget({ streak }) {
  if (!streak || !streak.recent || streak.recent.length === 0) {
    return <p style={{ color:'var(--color-text-muted)' }}>Sin partidas registradas todavia.</p>;
  }
  const { streakKind, streakLen, recent } = streak;
  const color = streakKind === 'Win' ? '#22c55e' : streakKind === 'Loss' ? '#ef4444' : 'var(--color-text-muted)';
  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'0.5rem', marginBottom:'0.75rem' }}>
        <span style={{ fontSize:'2.4em', fontWeight:700, color, fontFamily:'monospace' }}>{streakLen}</span>
        <span style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>
          {streakKind === 'Win' ? 'victorias seguidas' : streakKind === 'Loss' ? 'derrotas seguidas' : '—'}
        </span>
      </div>
      <div style={{ display:'flex', gap:'4px' }}>
        {recent.slice(0, 10).map((r, i) => {
          const c = r === 'Win' ? '#22c55e' : r === 'Loss' ? '#ef4444' : '#6b7280';
          return (
            <span key={i} title={r} style={{
              width: '22px', height: '22px', borderRadius: '4px',
              background: c + '22', color: c, border: '1px solid ' + c + '55',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700,
            }}>
              {r === 'Win' ? 'W' : r === 'Loss' ? 'L' : 'D'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function FavoriteWidget({ favorite }) {
  const fav = favorite?.favorite;
  if (!fav) return <p style={{ color:'var(--color-text-muted)' }}>Sin partidas registradas todavia.</p>;
  return (
    <div>
      <div style={{ fontSize:'1.4em', fontWeight:700, color:'var(--color-gold)', marginBottom:'0.4rem' }}>
        {fav.name}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', fontSize:'0.85em' }}>
        <div>
          <div style={{ color:'var(--color-text-muted)' }}>Partidas</div>
          <div style={{ fontWeight:600, fontFamily:'monospace' }}>{fav.games}</div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-muted)' }}>Win Rate</div>
          <div style={{ fontWeight:600, fontFamily:'monospace', color:'#22c55e' }}>{fav.winRate}%</div>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ color:'var(--color-text-muted)' }}>Trofeos netos</div>
          <div style={{ fontWeight:600, fontFamily:'monospace', color: fav.trophyChange >= 0 ? '#22c55e' : '#ef4444' }}>
            {fav.trophyChange >= 0 ? '+' : ''}{fav.trophyChange}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeDistribution({ data }) {
  if (!data || !data.modes || data.modes.length === 0) {
    return <p style={{ color:'var(--color-text-muted)' }}>Sin partidas registradas todavia.</p>;
  }
  const top = data.modes.slice(0, 6);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
      <div style={{ color:'var(--color-text-muted)', fontSize:'0.8em', marginBottom:'0.25rem' }}>
        {data.total} partidas analizadas
      </div>
      {top.map(m => {
        const color = modeColor(m.mode);
        return (
          <div key={m.mode}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85em', marginBottom:'2px' }}>
              <span>{m.mode}</span>
              <span style={{ fontFamily:'monospace', color }}>{m.count} · {m.percent}%</span>
            </div>
            <div style={{ height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ width: m.percent + '%', height:'100%', background: color, borderRadius:'3px' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}
