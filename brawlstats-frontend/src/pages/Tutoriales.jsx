import { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

/* ──────────────────────────────────────────────────────────────────
 * Datos
 * ────────────────────────────────────────────────────────────────── */
const TUTORIALS = [
  { title: 'Cómo jugar Gem Grab',      level: 'principiante', mode: 'Gem Grab',   duration: '8 min',  desc: 'Aprende las mecánicas básicas de Gem Grab y cómo coordinar con tu equipo para sujetar las 10 gemas.' },
  { title: 'Estrategias de Showdown',  level: 'intermedio',   mode: 'Showdown',   duration: '12 min', desc: 'Supervivencia, posicionamiento, gestión de power cubes y cuándo atacar en Showdown.' },
  { title: 'Domina Brawl Ball',        level: 'intermedio',   mode: 'Brawl Ball', duration: '10 min', desc: 'Control del balón, goles, pases con super y cómo defender tu portería sin morir.' },
  { title: 'Hot Zone avanzado',        level: 'avanzado',     mode: 'Hot Zone',   duration: '15 min', desc: 'Rotaciones, composición de equipo y control de zonas en partidas de alto nivel.' },
  { title: 'Knockout competitivo',     level: 'avanzado',     mode: 'Knockout',   duration: '18 min', desc: 'Draft, gestión de habilidades, posicionamiento de bushes y estrategias de torneo.' },
  { title: 'Heist: ataque y defensa',  level: 'principiante', mode: 'Heist',      duration: '7 min',  desc: 'Cómo romper la caja fuerte y cómo defenderla — los timings clave del modo.' },
];

const LEVELS = ['all', 'principiante', 'intermedio', 'avanzado'];

// Coherente con la paleta del sistema (brawlstats.css).
const LEVEL_META = {
  principiante: { color: 'var(--success)', dim: 'var(--success-dim)', border: 'rgba(34,197,94,0.28)',  label: 'Principiante' },
  intermedio:   { color: 'var(--blue)',    dim: 'var(--blue-dim)',    border: 'var(--blue-border)',    label: 'Intermedio' },
  avanzado:     { color: 'var(--error)',   dim: 'var(--error-dim)',   border: 'rgba(239,68,68,0.28)',  label: 'Avanzado' },
};

const LEVEL_LABEL = { all: 'Todos', principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

/* ──────────────────────────────────────────────────────────────────
 * Página
 * ────────────────────────────────────────────────────────────────── */
export default function Tutoriales() {
  const [search, setSearch] = useState('');
  const [level,  setLevel]  = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return TUTORIALS.filter(t => {
      if (term && !t.title.toLowerCase().includes(term)) return false;
      if (level !== 'all' && t.level !== level) return false;
      return true;
    });
  }, [search, level]);

  const resetFilters = () => { setSearch(''); setLevel('all'); };

  return (
    <Layout>
      <Topbar title="Tutoriales" />
      <div className="page">

        {/* ── Cabecera ── */}
        <div className="flex items-center justify-between mb-6" style={{ gap: 'var(--s4)', flexWrap: 'wrap' }}>
          <div>
            <h1 className="t-h2 mb-1">Tutoriales y guías</h1>
            <p className="t-sm text-3">
              Aprende los mejores trucos para cada modo de juego, de principiante a competitivo.
            </p>
          </div>
          <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>
            {filtered.length} / {TUTORIALS.length} tutoriales
          </span>
        </div>

        {/* ── Filtros ── */}
        <div className="card mb-6">
          <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Buscar tutorial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <span className="t-label" style={{ marginRight: 'var(--s2)' }}>Nivel:</span>
            {LEVELS.map(l => {
              const active = level === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
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
                  {LEVEL_LABEL[l]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Sin tutoriales
            </h3>
            <p className="t-sm text-3">
              No hay tutoriales que coincidan con esos filtros.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
              style={{ marginTop: 'var(--s4)' }}
            >
              Reset filtros
            </button>
          </div>
        ) : (
          <div className="grid cols-3" style={{ gap: 'var(--s5)' }}>
            {filtered.map((t, i) => (
              <TutorialCard key={t.title + i} tutorial={t} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Card de tutorial
 * ────────────────────────────────────────────────────────────────── */
function TutorialCard({ tutorial }) {
  const meta = LEVEL_META[tutorial.level] || LEVEL_META.principiante;

  const openYoutube = () => {
    const q = encodeURIComponent('brawl stars ' + tutorial.title);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="card"
      style={{
        borderLeft: '3px solid ' + meta.color,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
        transition: 'var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--blue-border)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)';
        e.currentTarget.style.borderLeft = '3px solid ' + meta.color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderLeft = '3px solid ' + meta.color;
      }}
    >
      {/* Header: nivel + duración */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)' }}>
        <span
          style={{
            background: meta.dim,
            color: meta.color,
            border: '1px solid ' + meta.border,
            borderRadius: 999,
            padding: '3px 10px',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {LEVEL_LABEL[tutorial.level]}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-3)',
            letterSpacing: '0.02em',
          }}
        >
          · {tutorial.duration}
        </span>
      </div>

      {/* Título */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 800,
          color: 'var(--text-1)',
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          lineHeight: 1.15,
          margin: 0,
        }}
      >
        {tutorial.title}
      </h3>

      {/* Modo */}
      <div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--gold-dim)',
            color: 'var(--gold)',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--r-sm)',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {tutorial.mode}
        </span>
      </div>

      {/* Descripción */}
      <p
        style={{
          color: 'var(--text-2)',
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          flex: 1,
        }}
      >
        {tutorial.desc}
      </p>

      {/* CTA */}
      <button
        type="button"
        className="btn btn-primary"
        onClick={openYoutube}
        style={{ marginTop: 'var(--s2)', width: '100%' }}
      >
        Ver tutorial →
      </button>
    </div>
  );
}
