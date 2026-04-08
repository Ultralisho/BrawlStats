import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

const RARITY_COLORS = {
  common:     '#9ca3af',
  rare:       '#22c55e',
  super_rare: '#3b82f6',
  epic:       '#a855f7',
  mythic:     '#f97316',
  legendary:  '#FACC15',
};

export default function BrawlerDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [brawler,    setBrawler]    = useState(null);
  const [ranking,    setRanking]    = useState([]);
  const [mySnaps,    setMySnaps]    = useState([]);  // entries from /stats/me filtered by brawlerId
  const [myWinRate,  setMyWinRate]  = useState(null); // { games, winRate, trophyChange } or null

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [rankingError,   setRankingError]   = useState(null);
  const [statsError,     setStatsError]     = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    setRanking([]); setRankingError(null);
    setMySnaps([]); setMyWinRate(null); setStatsError(null);

    // 1) Datos del brawler (bloqueante)
    fetchApi('/brawlers/' + id + '/full')
      .then(data => { if (alive) setBrawler(data); })
      .catch(err  => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });

    // 2) Ranking top 5 (no bloqueante)
    fetchApi('/brawlers/' + id + '/ranking')
      .then(data => { if (alive) setRanking(Array.isArray(data) ? data : []); })
      .catch(err  => { if (alive) setRankingError(err.message); });

    // 3) Stats del usuario filtradas por brawlerId (no bloqueante,
    //    falla silenciosamente si el usuario no tiene player vinculado)
    fetchApi('/stats/me')
      .then(data => {
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        const filtered = arr
          .filter(s => Number(s.brawlerId) === Number(id))
          .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
        setMySnaps(filtered);
      })
      .catch(err => { if (alive) setStatsError(err.message); });

    // 4) Win rate real del usuario con ese brawler (agregado desde batallas).
    //    El backend ahora incluye brawlerId en cada item — match directo por id.
    fetchApi('/stats/favorite-brawler')
      .then(data => {
        if (!alive || !data) return;
        const all = [...(data.top || []), data.favorite].filter(Boolean);
        const match = all.find(x => Number(x.brawlerId) === Number(id));
        setMyWinRate(match || null);
      })
      .catch(() => { /* opcional, ignorar */ });

    return () => { alive = false; };
  }, [id]);

  const backBtn = (
    <button
      className="btn"
      style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'var(--color-text-muted)' }}
      onClick={() => navigate('/brawlers')}
    >
      ← Volver
    </button>
  );

  if (loading) return (
    <Layout>
      <Topbar title="Brawler" actions={backBtn} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ color:'var(--color-text-muted)' }}>Cargando brawler...</p>
      </div>
    </Layout>
  );

  if (error || !brawler) return (
    <Layout>
      <Topbar title="Brawler no encontrado" actions={backBtn} />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        <div className="card" style={{ textAlign:'center', padding:'4rem 2rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>❓</div>
          <h2 style={{ color:'var(--color-text)', marginBottom:'0.5rem' }}>Brawler no encontrado</h2>
          <p style={{ color:'var(--color-text-muted)', marginBottom:'2rem' }}>{error ?? 'No existe ningún brawler con ese ID.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/brawlers')}>← Volver a Brawlers</button>
        </div>
      </div>
    </Layout>
  );

  const rarityColor = RARITY_COLORS[brawler.rarity] || '#9ca3af';

  // myWinRate ya viene resuelto por brawlerId desde el effect
  const myStats = myWinRate;

  // Última snapshot del usuario con este brawler
  const lastSnap = mySnaps.length > 0 ? mySnaps[mySnaps.length - 1] : null;

  return (
    <Layout>
      <Topbar title={brawler.name} actions={backBtn} />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>

        {/* ── Header ── */}
        <div className="card" style={{ marginBottom:'1.5rem', borderTop:'3px solid ' + rarityColor }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', flexWrap:'wrap' }}>
            <BrawlerHeaderImg id={brawler.id} name={brawler.name} color={rarityColor} />

            <div style={{ flex:1 }}>
              <h1 style={{ fontSize:'1.8em', fontWeight:800, color:'var(--color-text)', marginBottom:'0.4rem', fontFamily:'var(--font-display)' }}>
                {brawler.name}
              </h1>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {brawler.rarity && (
                  <span style={{ background: rarityColor + '22', color: rarityColor, borderRadius:'4px', padding:'3px 10px', fontSize:'0.78em', fontWeight:700 }}>
                    {brawler.rarity.replace(/_/g,' ').toUpperCase()}
                  </span>
                )}
                {brawler.role && (
                  <span style={{ background:'rgba(255,255,255,0.07)', color:'var(--color-text-muted)', borderRadius:'4px', padding:'3px 10px', fontSize:'0.78em', fontWeight:600 }}>
                    {brawler.role}
                  </span>
                )}
              </div>
              {brawler.description && (
                <p style={{ color:'var(--color-text-muted)', fontSize:'0.9em', marginTop:'0.75rem', lineHeight:1.6, maxWidth:'600px' }}>
                  {brawler.description}
                </p>
              )}
              <div style={{ marginTop:'1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/builds?brawler=' + brawler.id)}
                >
                  ⚡ Ver builds de este brawler
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mis stats con este brawler ── */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <h3 className="card-title">Mis estadísticas con {brawler.name}</h3>
          {statsError ? (
            <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles.</p>
          ) : (!lastSnap && !myStats) ? (
            <p style={{ color:'var(--color-text-muted)' }}>
              Sin datos disponibles. Aún no has jugado partidas registradas con este brawler.
            </p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem' }}>
              {lastSnap && (
                <>
                  <StatCard label="Trofeos"     value={lastSnap.trophies != null ? lastSnap.trophies.toLocaleString() : '-'}        accent="#FACC15" />
                  <StatCard label="Max trofeos" value={lastSnap.highestTrophies != null ? lastSnap.highestTrophies.toLocaleString() : '-'} accent="#a855f7" />
                  {lastSnap.rank != null && <StatCard label="Rank" value={lastSnap.rank} accent="#3b82f6" />}
                </>
              )}
              {myStats && (
                <>
                  <StatCard label="Partidas" value={myStats.games} accent="#3b82f6" />
                  <StatCard label="Win Rate" value={myStats.winRate + '%'} accent="#22c55e" />
                  <StatCard
                    label="Trofeos netos"
                    value={(myStats.trophyChange >= 0 ? '+' : '') + myStats.trophyChange}
                    accent={myStats.trophyChange >= 0 ? '#22c55e' : '#ef4444'}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Evolución de trofeos ── */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <h3 className="card-title">Evolución de trofeos · histórico personal</h3>
          {mySnaps.length < 2
            ? <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles. Sincroniza varias veces para ver tu evolución con este brawler.</p>
            : <TrophyChart data={mySnaps.map(s => ({ t: s.recordedAt, v: s.trophies }))} />
          }
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>

          {/* ── Gadgets ── */}
          <div className="card">
            <h3 className="card-title">Gadgets</h3>
            {!brawler.gadgets || brawler.gadgets.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {brawler.gadgets.map(g => (
                    <AbilityCard
                      key={g.id ?? g.name}
                      type="Gadget"
                      name={g.name}
                      color="#3b82f6"
                      imageUrl={g.id ? `https://cdn.brawlify.com/gadgets/regular/${g.id}.png` : null}
                    />
                  ))}
                </div>
              )
            }
          </div>

          {/* ── Star Powers ── */}
          <div className="card">
            <h3 className="card-title">Star Powers</h3>
            {!brawler.starPowers || brawler.starPowers.length === 0
              ? <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {brawler.starPowers.map(sp => (
                    <AbilityCard
                      key={sp.id ?? sp.name}
                      type="Star Power"
                      name={sp.name}
                      color="#FACC15"
                      imageUrl={sp.id ? `https://cdn.brawlify.com/star-powers/regular/${sp.id}.png` : null}
                    />
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* ── Top 5 jugadores globales ── */}
        <div className="card">
          <h3 className="card-title">Top 5 mundial con {brawler.name}</h3>
          {rankingError ? (
            <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles.</p>
          ) : ranking.length === 0 ? (
            <p style={{ color:'var(--color-text-muted)' }}>Sin datos disponibles.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:'48px' }}>#</th>
                  <th>Jugador</th>
                  <th>Tag</th>
                  <th>Trofeos</th>
                  <th>Club</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (p.rank ?? i + 1);
                  return (
                    <tr key={p.tag || i}>
                      <td>
                        <span style={{ fontWeight:700, color: i === 0 ? '#FACC15' : i === 1 ? '#e2e8f0' : i === 2 ? '#cd7c2f' : 'var(--color-text-muted)', fontSize: i < 3 ? '1.1em' : '1em' }}>
                          {medal}
                        </span>
                      </td>
                      <td style={{ fontWeight: i < 3 ? 600 : 400 }}>{p.name}</td>
                      <td style={{ color:'var(--color-text-muted)', fontFamily:'monospace', fontSize:'0.85em' }}>{p.tag}</td>
                      <td style={{ color:'var(--color-gold)', fontWeight:600 }}>{p.trophies != null ? p.trophies.toLocaleString() : '-'}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{p.club || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card" style={{ borderTop:'2px solid ' + accent }}>
      <div style={{ color:'var(--color-text-muted)', fontSize:'0.72em', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>{label}</div>
      <div style={{ fontSize:'1.5em', fontWeight:700, color: accent, fontFamily:'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

function BrawlerHeaderImg({ id, name, color, size = 96 }) {
  const [failed, setFailed] = useState(false);
  if (failed || id == null) {
    return (
      <div style={{
        width:size, height:size, borderRadius:16, flexShrink:0,
        background: color + '22', border:'2px solid ' + color + '55',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'2.2rem', fontWeight:800, color,
        fontFamily:'var(--font-display)',
      }}>
        {name?.[0] ?? '?'}
      </div>
    );
  }
  return (
    <img
      src={`https://cdn.brawlify.com/brawlers/borders/${id}.png`}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width:size, height:size, objectFit:'contain', flexShrink:0, display:'block' }}
    />
  );
}

function AbilityImg({ src, color, fallback, size = 44 }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div style={{
        width:size, height:size, borderRadius:8, flexShrink:0,
        background: color + '1f', border:'1px solid ' + color + '55',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'1rem', fontWeight:800, color,
      }}>
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width:size, height:size, objectFit:'contain', flexShrink:0 }}
    />
  );
}

function AbilityCard({ type, name, color, imageUrl }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:'10px', padding:'0.875rem',
      display:'flex', alignItems:'center', gap:'0.75rem',
    }}>
      <AbilityImg src={imageUrl} color={color} fallback={name?.[0] ?? '?'} />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'0.7em', color, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'4px' }}>{type}</div>
        <div style={{ fontWeight:600, color:'var(--color-text)', fontSize:'0.95em' }}>{name}</div>
      </div>
    </div>
  );
}

function TrophyChart({ data }) {
  const W = 800, H = 180, P = { l: 50, r: 12, t: 12, b: 28 };
  const xs = data.map(d => new Date(d.t).getTime());
  const ys = data.map(d => d.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = Math.max(1, xMax - xMin);
  const yRange = Math.max(1, yMax - yMin);
  const px = x => P.l + ((x - xMin) / xRange) * (W - P.l - P.r);
  const py = y => P.t + (1 - (y - yMin) / yRange) * (H - P.t - P.b);
  const pts = data.map(d => [px(new Date(d.t).getTime()), py(d.v)]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = path + ` L ${pts[pts.length-1][0].toFixed(1)} ${H - P.b} L ${pts[0][0].toFixed(1)} ${H - P.b} Z`;
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange * i) / 4);
  const delta = ys[ys.length - 1] - ys[0];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem', fontSize:'0.85em' }}>
        <span style={{ color:'var(--color-text-muted)' }}>{data.length} snapshots</span>
        <span style={{ color: delta >= 0 ? '#22c55e' : '#ef4444', fontWeight:600 }}>
          {delta >= 0 ? '+' : ''}{delta.toLocaleString('es-ES')} trofeos
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible' }}>
        <defs>
          <linearGradient id="bdTrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={py(v)} y2={py(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={P.l - 6} y={py(v) + 3} textAnchor="end" fontSize="10" fill="#6b7280" fontFamily="monospace">
              {Math.round(v).toLocaleString('es-ES')}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#bdTrGrad)"/>
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#3b82f6"/>)}
      </svg>
    </div>
  );
}
