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

  useEffect(() => {
    fetchApi('/brawlers')
      .then(data => setBrawlers(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const rarities = ['all', ...new Set(brawlers.map(b => b.rarity).filter(Boolean))];
  const roles    = ['all', ...new Set(brawlers.map(b => b.role).filter(Boolean))];

  const filtered = brawlers.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    const matchRarity = rarityF === 'all' || b.rarity === rarityF;
    const matchRole   = roleF   === 'all' || b.role   === roleF;
    return matchSearch && matchRarity && matchRole;
  });

  return (
    <Layout>
      <Topbar title="Brawlers" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#ef4444' }}>
            {error}
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
            {filtered.map(b => {
              const color = RARITY_COLORS[b.rarity] || '#9ca3af';
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


