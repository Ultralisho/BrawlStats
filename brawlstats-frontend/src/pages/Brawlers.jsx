import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';

const RARITY_COLORS = {
  common:     '#9ca3af',
  rare:       '#22c55e',
  super_rare: '#3b82f6',
  epic:       '#a855f7',
  mythic:     '#f97316',
  legendary:  '#FACC15',
};

// Color por win rate (misma convención que la Tier List: rojo = meta dominante)
const wrColor = (wr) =>
  wr == null ? 'var(--color-text-muted)' :
  wr >= 60   ? '#EF4444' :
  wr >= 55   ? '#F59E0B' :
  wr >= 50   ? '#22C55E' :
  wr >= 45   ? '#3B82F6' : '#8B5CF6';

function BrawlerImg({ id, name, color, size = 80 }) {
  const [failed, setFailed] = useState(false);
  const fallback = (
    <div style={{
      width: size, height: size, borderRadius: 12, margin: '0 auto 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: color + '22', border: '1px solid ' + color + '55',
      color, fontSize: '1.6rem', fontWeight: 800,
      fontFamily: 'var(--font-display)',
    }}>
      {name?.[0] ?? '?'}
    </div>
  );
  if (failed || id == null) return fallback;
  return (
    <img
      src={`https://cdn.brawlify.com/brawlers/borders/${id}.png`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }}
    />
  );
}

export default function Brawlers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [brawlers,  setBrawlers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState(searchParams.get('search') || '');
  const [rarityF,   setRarityF]   = useState('all');
  const [roleF,     setRoleF]     = useState('all');
  const [topPlayers, setTopPlayers] = useState([]);
  const [wrById,    setWrById]    = useState({});
  const [hcById,    setHcById]    = useState({});
  const [sortBy,    setSortBy]    = useState('name');

  useEffect(() => {
    fetchApi('/brawlers')
      .then(data => setBrawlers(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Top 5 mundial de jugadores (ranking global de la API oficial)
  useEffect(() => {
    fetchApi('/leaderboard/global')
      .then(data => setTopPlayers(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setTopPlayers([]));
  }, []);

  // Hypercharge por brawler (directo a BrawlAPI)
  useEffect(() => {
    fetch('/api/brawlapi/brawlers')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = Array.isArray(data?.list) ? data.list : [];
        const map = {};
        list.forEach(b => { map[b.id] = !!b.hypercharge; });
        setHcById(map);
      })
      .catch(() => {});
  }, []);

  // Win rate global por brawler (para los badges y el orden)
  useEffect(() => {
    fetchApi('/brawlers/winrates')
      .then(data => {
        const map = {};
        (Array.isArray(data) ? data : []).forEach(w => { map[w.id] = { winRate: w.winRate, games: w.games }; });
        setWrById(map);
      })
      .catch(() => setWrById({}));
  }, []);

  const rarities = ['all', ...new Set(brawlers.map(b => b.rarity).filter(Boolean))];
  const roles    = ['all', ...new Set(brawlers.map(b => b.role).filter(Boolean))];

  const filtered = brawlers.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    const matchRarity = rarityF === 'all' || b.rarity === rarityF;
    const matchRole   = roleF   === 'all' || b.role   === roleF;
    return matchSearch && matchRarity && matchRole;
  });

  const sorted = sortBy === 'winRate'
    ? [...filtered].sort((a, b) => {
        const wa = wrById[a.id]?.winRate, wb = wrById[b.id]?.winRate;
        if (wa == null && wb == null) return (a.name || '').localeCompare(b.name || '');
        if (wa == null) return 1;
        if (wb == null) return -1;
        return wb - wa;
      })
    : filtered;

  return (
    <Layout>
      <Topbar title="Brawlers" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#ef4444' }}>
            {error}
          </div>
        )}

        {topPlayers.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--color-text-muted)' }}>
                Top 5 mundial
              </span>
              <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>· por trofeos · ranking oficial</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px,1fr))', gap:'0.75rem' }}>
              {topPlayers.map((p, i) => {
                const cleanTag = (p.tag || '').replace('#', '');
                const medal = ['🥇','🥈','🥉'][i] || ('#' + (i + 1));
                return (
                  <button
                    key={p.tag || i}
                    type="button"
                    onClick={() => cleanTag && navigate('/jugador/' + cleanTag)}
                    title={cleanTag ? 'Ver perfil de ' + p.name : ''}
                    style={{
                      textAlign:'left', display:'flex', alignItems:'center', gap:'0.6rem',
                      padding:'0.6rem 0.75rem', background:'rgba(255,255,255,0.03)',
                      border:'1px solid rgba(255,255,255,0.08)', borderRadius:8,
                      cursor: cleanTag ? 'pointer' : 'default',
                    }}
                  >
                    <span style={{ fontSize:'1.1rem', minWidth:26, textAlign:'center' }}>{medal}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, color:'var(--color-gold)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize:'0.8em', color:'var(--color-text-muted)', fontFamily:'monospace' }}>
                        {p.trophies != null ? p.trophies.toLocaleString('es-ES') : '-'} 🏆
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
            <input
              className="form-input"
              placeholder="Buscar brawler..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex:1, minWidth:'180px' }}
            />
            <select className="form-input" value={rarityF} onChange={e => setRarityF(e.target.value)} style={{ minWidth:'140px' }}>
              {rarities.map(r => (
                <option key={r} value={r}>{r === 'all' ? 'Todas las rarezas' : r.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select className="form-input" value={roleF} onChange={e => setRoleF(e.target.value)} style={{ minWidth:'140px' }}>
              {roles.map(r => (
                <option key={r} value={r}>{r === 'all' ? 'Todos los roles' : r}</option>
              ))}
            </select>
            <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ minWidth:'150px' }}>
              <option value="name">Ordenar: A–Z</option>
              <option value="winRate">Ordenar: Win rate</option>
            </select>
            <span style={{ color:'var(--color-text-muted)', fontSize:'0.9em', whiteSpace:'nowrap' }}>
              {filtered.length} brawlers
            </span>
          </div>
        </div>

        {loading ? (
          <p style={{ color:'var(--color-text-muted)', textAlign:'center', padding:'3rem' }}>Cargando brawlers...</p>
        ) : brawlers.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'4rem 2rem' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🎮</div>
            <h3 style={{ color:'var(--color-text)', marginBottom:'0.5rem' }}>Sin brawlers en la base de datos</h3>
            <p style={{ color:'var(--color-text-muted)' }}>
              Un administrador debe sincronizar los brawlers desde la API de Brawl Stars.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color:'var(--color-text-muted)', textAlign:'center', padding:'2rem' }}>
            No se encontraron brawlers con esos filtros.
          </p>
        ) : (
          <div className="brawler-grid">
            {sorted.map(b => {
              const color = RARITY_COLORS[b.rarity] || '#9ca3af';
              const wr = wrById[b.id]?.winRate;
              const hasHC = hcById[b.id] === true;
              return (
                <div
                  key={b.id}
                  className="brawler-card"
                  style={{ borderTop:'2px solid ' + color, cursor:'pointer' }}
                  onClick={() => navigate('/brawlers/' + b.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate('/brawlers/' + b.id)}
                >
                  <BrawlerImg id={b.id} name={b.name} color={color} />
                  <div className="brawler-name">{b.name}</div>
                  <div style={{ marginTop:'6px', display:'flex', gap:'4px', flexWrap:'wrap' }}>
                    <span style={{ background: color + '22', color, borderRadius:'4px', padding:'2px 6px', fontSize:'0.72em', fontWeight:600 }}>
                      {b.rarity ? b.rarity.replace(/_/g,' ') : '-'}
                    </span>
                    {b.role && (
                      <span style={{ background:'rgba(255,255,255,0.07)', color:'var(--color-text-muted)', borderRadius:'4px', padding:'2px 6px', fontSize:'0.72em' }}>
                        {b.role}
                      </span>
                    )}
                    {wr != null && (
                      <span style={{ background: wrColor(wr) + '22', color: wrColor(wr), borderRadius:'4px', padding:'2px 6px', fontSize:'0.72em', fontWeight:700, fontFamily:'monospace' }}>
                        {wr}%
                      </span>
                    )}
                    {hasHC && (
                      <span style={{ background:'rgba(250,204,21,0.18)', color:'#FACC15', borderRadius:'4px', padding:'2px 6px', fontSize:'0.72em', fontWeight:800, border:'1px solid rgba(250,204,21,0.35)' }}>
                        ⚡HC
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}


