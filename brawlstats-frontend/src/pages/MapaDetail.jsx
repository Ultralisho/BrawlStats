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

// El icono de modo de Brawlify usa el id completo del modo (ej. 48000005):
// cdn.brawlify.com/game-modes/regular/{gameMode.id}.png
const modeImgUrl = (modeId) => modeId ? `https://cdn.brawlify.com/game-modes/regular/${modeId}.png` : null;

// BrawlAPI devuelve el nombre del modo en MAYÚSCULAS ("BRAWL BALL"); lo
// normalizamos a "Brawl Ball" para casarlo con las etiquetas del backend.
const titleCase = (s) => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// Color de la barra de win rate (umbral del spec): verde >60, amarillo 50-60, rojo <50
const barColor = (wr) => wr > 60 ? '#22c55e' : wr >= 50 ? '#facc15' : '#ef4444';

export default function MapaDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [map,      setMap]      = useState(null);
  const [brawlers, setBrawlers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [bestByMode, setBestByMode] = useState([]);
  const [bestLoading, setBestLoading] = useState(false);

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

  // Mejores brawlers para este mapa: BrawlAPI ya no expone stats por mapa, así
  // que usamos el win rate agregado del MODO del mapa (única señal de la API).
  useEffect(() => {
    const modeName = map?.gameMode?.name;
    if (!modeName) { setBestByMode([]); return; }
    let alive = true;
    setBestLoading(true);
    fetchApi('/brawlers/winrates?mode=' + encodeURIComponent(titleCase(modeName)) + '&minSamples=3')
      .then(d => {
        if (!alive) return;
        const list = Array.isArray(d) ? d : [];
        const best = list.filter(b => b.winRate != null)
                         .sort((a, b) => b.winRate - a.winRate)
                         .slice(0, 8);
        setBestByMode(best);
      })
      .catch(() => { if (alive) setBestByMode([]); })
      .finally(() => { if (alive) setBestLoading(false); });
    return () => { alive = false; };
  }, [map]);

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

  // Mejores brawlers del mapa: usa las stats por-mapa si existen (señal más
  // específica); si no, cae al win rate del modo (bestByMode). Ambas fuentes
  // se normalizan a { id, name, winRate }.
  const bestBrawlers = useMemo(() => {
    if (stats.length > 0) {
      return [...stats]
        .filter(s => s.winRate != null && s.winRate > 0)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10)
        .map(s => ({ id: s.brawlerId, name: s.name, winRate: s.winRate }));
    }
    return bestByMode.map(b => ({ id: b.id, name: b.name, winRate: b.winRate }));
  }, [stats, bestByMode]);

  const truncName = (n) => (n && n.length > 10 ? n.slice(0, 10) + '…' : (n || ''));

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
  const modeImg   = modeImgUrl(map.gameMode?.id); // icono de modo de Brawlify por id
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

            {/* Mejores brawlers para este mapa — lista con barra de win rate */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Mejores brawlers
              </span>
              <span style={{ fontSize:11, color:'var(--text-3)' }}>
                {titleCase(modeName)} · win rate
              </span>
            </div>

            {bestLoading && bestBrawlers.length === 0 ? (
              <p style={{ color:'var(--text-3)', textAlign:'center', padding:'1.5rem', fontSize:13 }}>Calculando…</p>
            ) : bestBrawlers.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:4 }}>
                  Sin estadísticas disponibles
                </div>
                <div style={{ fontSize:12 }}>
                  Aún no hay suficientes partidas en <strong>{titleCase(modeName)}</strong> para
                  estimar los mejores brawlers de este mapa.
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {bestBrawlers.map((b, i) => (
                  <Link
                    key={b.id}
                    to={'/brawlers/' + b.id}
                    style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.35rem 0.4rem', borderRadius:8, color:'inherit', textDecoration:'none' }}
                  >
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', minWidth:26, fontFamily:'var(--font-mono)' }}>
                      #{i + 1}
                    </span>
                    <img
                      src={'https://cdn.brawlify.com/brawlers/borders/' + b.id + '.png'}
                      alt={b.name}
                      width={40}
                      height={40}
                      onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                      style={{ objectFit:'contain', flexShrink:0 }}
                    />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', minWidth:88, whiteSpace:'nowrap' }} title={b.name}>
                      {truncName(b.name)}
                    </span>
                    {b.winRate != null ? (
                      <>
                        <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.1)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ width: Math.min(100, b.winRate) + '%', height:'100%', background: barColor(b.winRate), borderRadius:4, transition:'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)', color: barColor(b.winRate), minWidth:44, textAlign:'right' }}>
                          {Math.round(b.winRate)}%
                        </span>
                      </>
                    ) : (
                      <div style={{ flex:1 }} />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
