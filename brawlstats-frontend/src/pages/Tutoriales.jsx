import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

const CATEGORIES = ['all', 'Básico', 'Intermedio', 'Avanzado', 'Modos de juego'];

const CAT_META = {
  'Básico':          { color: 'var(--success)', dim: 'var(--success-dim)', border: 'rgba(34,197,94,0.28)' },
  'Intermedio':      { color: 'var(--blue)',    dim: 'var(--blue-dim)',    border: 'var(--blue-border)'   },
  'Avanzado':        { color: 'var(--error)',   dim: 'var(--error-dim)',   border: 'rgba(239,68,68,0.28)' },
  'Modos de juego':  { color: 'var(--gold)',    dim: 'var(--gold-dim)',    border: 'var(--gold-border)'   },
};
const catMeta = (c) => CAT_META[c] || CAT_META['Básico'];

const CAT_LABEL = {
  all: 'Todas', 'Básico': 'Básico', 'Intermedio': 'Intermedio',
  'Avanzado': 'Avanzado', 'Modos de juego': 'Modos de juego',
};

export default function Tutoriales() {
  const [tutorials,    setTutorials]    = useState([]);
  const [brawlersById, setBrawlersById] = useState({}); // { 'Leon': 16000012, ... }
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [cat,          setCat]          = useState('all');

  useEffect(() => {
    fetchApi('/tutorials')
      .then(data => setTutorials(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Resuelve nombre de brawler -> id, mirando la tabla de brawlers del backend
  useEffect(() => {
    fetchApi('/brawlers')
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        const map = {};
        for (const b of list) {
          if (b?.name) map[b.name.toLowerCase()] = b.id;
        }
        setBrawlersById(map);
      })
      .catch(() => setBrawlersById({}));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tutorials.filter(t => {
      if (term && !(t.title || '').toLowerCase().includes(term)) return false;
      if (cat !== 'all' && t.category !== cat) return false;
      return true;
    });
  }, [tutorials, search, cat]);

  const resetFilters = () => { setSearch(''); setCat('all'); };

  return (
    <Layout>
      <Topbar title="Tutoriales" />
      <div className="page">

        <div className="flex items-center justify-between mb-6" style={{ gap: 'var(--s4)', flexWrap: 'wrap' }}>
          <div>
            <h1 className="t-h2 mb-1">Tutoriales y guías</h1>
            <p className="t-sm text-3">
              Aprende los mejores trucos para cada modo de juego, de principiante a competitivo.
            </p>
          </div>
          <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>
            {filtered.length} / {tutorials.length} tutoriales
          </span>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="card mb-6">
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Buscar tutorial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <span className="t-label" style={{ marginRight: 'var(--s2)' }}>Categoría:</span>
            {CATEGORIES.map(c => {
              const active = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--r-md)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    background: active ? 'var(--blue-dim)' : 'transparent',
                    color:      active ? 'var(--blue)'    : 'var(--text-2)',
                    border: '1px solid ' + (active ? 'var(--blue-border)' : 'var(--border)'),
                  }}
                >
                  {CAT_LABEL[c]}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner" />
          </div>
        ) : tutorials.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Aún no hay tutoriales
            </h3>
            <p className="t-sm text-3">
              Un administrador puede crear tutoriales desde el panel de administración.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Sin tutoriales
            </h3>
            <p className="t-sm text-3">No hay tutoriales que coincidan con esos filtros.</p>
            <button type="button" className="btn btn-secondary" onClick={resetFilters} style={{ marginTop: 'var(--s4)' }}>
              Reset filtros
            </button>
          </div>
        ) : (
          <div className="grid cols-3" style={{ gap: 'var(--s5)' }}>
            {filtered.map(t => (
              <TutorialCard key={t.id} tutorial={t} brawlersByName={brawlersById} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}

function TutorialCard({ tutorial, brawlersByName }) {
  const meta = catMeta(tutorial.category);
  const [imgFailed, setImgFailed] = useState(false);

  const brawlerId = tutorial.brawler
    ? brawlersByName[tutorial.brawler.toLowerCase()]
    : null;
  const brawlerImg = brawlerId
    ? `https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`
    : null;

  const openYouTube = () => {
    const q = (tutorial.youtubeQuery || tutorial.title || '').trim();
    if (!q) return;
    const href = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="card"
      style={{ borderLeft: '3px solid ' + meta.color, display: 'flex', flexDirection: 'column', gap: 'var(--s3)', transition: 'var(--transition)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)' }}>
        <span style={{ background: meta.dim, color: meta.color, border: '1px solid ' + meta.border, borderRadius: 999, padding: '3px 10px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {tutorial.category}
        </span>
        {tutorial.level && (
          <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {tutorial.level}
          </span>
        )}
      </div>

      {brawlerImg && !imgFailed && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={brawlerImg}
            alt={tutorial.brawler}
            width={72}
            height={72}
            loading="lazy"
            onError={() => setImgFailed(true)}
            style={{ width: 72, height: 72, objectFit: 'contain' }}
          />
        </div>
      )}

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0 }}>
        {tutorial.title}
      </h3>

      {tutorial.description && (
        <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55, margin: 0, flex: 1 }}>
          {tutorial.description}
        </p>
      )}

      <button type="button" className="btn btn-primary" onClick={openYouTube} style={{ marginTop: 'var(--s2)', width: '100%' }}>
        Buscar en YouTube →
      </button>
    </div>
  );
}
