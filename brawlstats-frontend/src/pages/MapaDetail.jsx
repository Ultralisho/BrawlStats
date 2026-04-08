import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

const COMPETITIVE_MODES = new Set([
  'Gem Grab', 'Brawl Ball', 'Hot Zone', 'Knockout', 'Bounty', 'Heist',
]);

const MODE_ICONS = {
  'Gem Grab':'💎', 'Brawl Ball':'⚽', 'Showdown':'💀', 'Solo Showdown':'💀',
  'Duo Showdown':'💀', 'Hot Zone':'🔥', 'Knockout':'🥊', 'Bounty':'⭐',
  'Heist':'💰', 'Duels':'⚔️', 'Wipeout':'💥', 'Siege':'🛡️',
};

// IDs propios de brawlify para los iconos de modo (cdn.brawlify.com/game-modes/regular/{id}.png)
const MODE_IMG_ID = {
  'Gem Grab':1, 'Showdown':2, 'Brawl Ball':3, 'Solo Showdown':4, 'Duo Showdown':5,
  'Bounty':6, 'Heist':7, 'Siege':9, 'Hot Zone':17, 'Basket Brawl':23,
  'Duels':24, 'Wipeout':38, 'Knockout':39, 'Paint Brawl':49, 'Trio Showdown':51,
};
function modeImgUrl(modeName) {
  const id = MODE_IMG_ID[modeName];
  return id ? `https://cdn.brawlify.com/game-modes/regular/${id}.png` : null;
}

export default function MapaDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [map,      setMap]      = useState(null);
  const [brawlers, setBrawlers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Orden por defecto: Pick Rate descendente (igual al spec)
  const [sortKey, setSortKey] = useState('useRate');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    async function load() {
      // Carga paralela: detalle del mapa + catálogo de brawlers
      const [mapData, brawData] = await Promise.all([
        fetchApi('/brawlers/maps/' + encodeURIComponent(id)),
        fetchApi('/brawlers').catch(() => []),
      ]);
      if (!alive) return;

      // BrawlAPI a veces incluye `stats` solo en el endpoint de lista y no
      // en el detalle individual. Si el detalle llega sin stats, buscamos
      // en la lista completa para encontrar el mapa y tomar sus stats.
      let finalMap = mapData;
      const hasStats = Array.isArray(mapData?.stats) && mapData.stats.length > 0;
      if (!hasStats) {
        try {
          const allMaps = await fetchApi('/brawlers/maps');
          const found = Array.isArray(allMaps)
            ? allMaps.find(m => String(m.id) === String(id))
            : null;
          if (found?.stats?.length) {
            finalMap = { ...mapData, stats: found.stats };
          }
        } catch { /* si falla el fallback, seguimos sin stats */ }
      }

      setMap(finalMap);
      setBrawlers(Array.isArray(brawData) ? brawData : []);
    }

    load()
      .catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [id]);

  const brawlerNameById = (bid) => {
    const found = brawlers.find(b => Number(b.id) === Number(bid));
    return found?.name || ('#' + bid);
  };

  // Normaliza stats: BrawlAPI usa `useRate`; tambien aceptamos `pickRate`
  // por si el backend o el contrato cambia. `s.brawler` puede ser id o objeto.
  const stats = useMemo(() => {
    const raw = Array.isArray(map?.stats) ? map.stats : [];
    return raw.map(s => {
      const isObj     = s.brawler && typeof s.brawler === 'object';
      const brawlerId = isObj ? s.brawler.id   : s.brawler;
      const inlineNm  = isObj ? s.brawler.name : null;
      return {
        brawlerId,
        name:    inlineNm || brawlerNameById(brawlerId),
        winRate: Number(s.winRate  ?? 0),
        useRate: Number(s.useRate  ?? s.pickRate ?? 0),
      };
    });
  }, [map, brawlers]);

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [stats, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortArrow = (key) => {
    if (sortKey !== key) return null;
    return <span className="mapa-detail-sort-arrow">{sortDir === 'desc' ? '▼' : '▲'}</span>;
  };

  const wrColor = (wr) => wr > 55 ? '#22c55e' : wr >= 45 ? '#facc15' : '#ef4444';

  if (loading) return (
    <Layout>
      <Topbar title="Mapa" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ color:'var(--text-2)' }}>Cargando mapa...</p>
      </div>
    </Layout>
  );

  if (error || !map) return (
    <Layout>
      <Topbar title="Mapa" />
      <div style={{ padding:'1.5rem' }}>
        <button className="mapa-detail-back" onClick={() => navigate('/mapas')}>← Volver</button>
        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🗺️</div>
          <h3 style={{ color:'var(--text-1)' }}>Mapa no encontrado</h3>
          <p style={{ color:'var(--text-2)', marginBottom:'1.5rem' }}>{error || 'No se pudo cargar el mapa.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/mapas')}>Volver a mapas</button>
        </div>
      </div>
    </Layout>
  );

  const modeName  = map.gameMode?.name || '—';
  const modeIcon  = MODE_ICONS[modeName] || '🎮';
  const modeImg   = modeImgUrl(modeName); // URL construida desde nuestro mapeo (evita 404)
  const modeColor = map.gameMode?.color || 'var(--blue)';
  const envName   = map.environment?.name || null;
  const isCompetitive = COMPETITIVE_MODES.has(modeName);

  // Imagen principal: CDN Brawlify regular; fallback al imageUrl del payload.
  const primaryImg  = 'https://cdn.brawlify.com/maps/regular/' + map.id + '.png';
  const fallbackImg = map.imageUrl || null;

  return (
    <Layout>
      <Topbar title={map.name || 'Mapa'} />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>

        <button className="mapa-detail-back" onClick={() => navigate('/mapas')}>← Volver</button>

        <div className="mapa-detail-grid">

          {/* Columna izquierda: imagen */}
          <div className="mapa-detail-img-wrap">
            <img
              src={primaryImg}
              alt={map.name}
              loading="lazy"
              onError={e => {
                const el = e.currentTarget;
                if (fallbackImg && el.src !== fallbackImg) {
                  el.src = fallbackImg;
                } else {
                  el.style.visibility = 'hidden';
                }
              }}
            />
          </div>

          {/* Columna derecha: contenido */}
          <div className="mapa-detail-content card">
            <div className="mapa-detail-head" style={{ flexDirection:'column' }}>
              <h1 className="mapa-detail-name">{map.name}</h1>
              <div className="mapa-detail-sub">
                {modeImg
                  ? <img src={modeImg} alt={modeName} width={20} height={20}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : <span style={{ fontSize:'1.05em' }}>{modeIcon}</span>}
                <span style={{ color: modeColor, fontWeight:600 }}>{modeName}</span>
                {envName && (
                  <>
                    <span style={{ color:'var(--text-3)' }}>·</span>
                    <span>{envName}</span>
                  </>
                )}
                {isCompetitive && (
                  <span className="mapa-detail-comp" style={{ marginLeft:'auto' }}>
                    COMPETITIVO
                  </span>
                )}
              </div>
            </div>

            {/* Tabla de brawlers */}
            {sorted.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:4 }}>
                  Sin estadísticas disponibles
                </div>
                <div style={{ fontSize:12 }}>
                  Las estadísticas solo están disponibles para mapas en rotación activa.
                </div>
              </div>
            ) : (
              <div className="mapa-detail-table-wrap">
                <div className="mapa-detail-table-scroll">
                  <table className="mapa-detail-table">
                    <thead>
                      <tr>
                        <th>Brawler</th>
                        <th
                          className={'mapa-detail-th-sortable' + (sortKey === 'winRate' ? ' is-active' : '')}
                          onClick={() => handleSort('winRate')}
                        >
                          Win Rate{sortArrow('winRate')}
                        </th>
                        <th
                          className={'mapa-detail-th-sortable mapa-detail-hide-mobile' + (sortKey === 'useRate' ? ' is-active' : '')}
                          onClick={() => handleSort('useRate')}
                        >
                          Pick Rate{sortArrow('useRate')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(s => (
                        <tr key={s.brawlerId}>
                          <td>
                            <Link to={'/brawlers/' + s.brawlerId} className="mapa-detail-row">
                              <img
                                src={'https://cdn.brawlify.com/brawlers/borders/' + s.brawlerId + '.png'}
                                alt={s.name}
                                onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                              <span style={{ fontWeight:500 }}>{s.name}</span>
                            </Link>
                          </td>
                          <td style={{ color: wrColor(s.winRate), fontFamily:'var(--font-mono)', fontWeight:700 }}>
                            {s.winRate.toFixed(1)}%
                          </td>
                          <td className="mapa-detail-hide-mobile" style={{ fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>
                            {s.useRate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
