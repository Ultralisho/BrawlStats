import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';

const MODE_ICONS = {
  'Gem Grab':     '💎',
  'Brawl Ball':   '⚽',
  'Showdown':     '💀',
  'Solo Showdown':'💀',
  'Duo Showdown': '💀',
  'Hot Zone':     '🔥',
  'Knockout':     '🥊',
  'Bounty':       '⭐',
  'Heist':        '💰',
  'Duels':        '⚔️',
  'Wipeout':      '💥',
  'Siege':        '🛡️',
};

function timeLeft(endTime) {
  if (!endTime) return null;
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  return h + 'h ' + m + 'm';
}

function MapImage({ src, mode, name }) {
  const [failed, setFailed] = useState(false);
  const ratio = { width: '100%', aspectRatio: '1 / 1', borderRadius: '8px', marginBottom: '0.75rem' };
  if (failed || !src) {
    return (
      <div style={{
        ...ratio,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        flexDirection: 'column', gap: '0.5rem',
      }}>
        <span style={{ fontSize: '3rem' }}>{MODE_ICONS[mode] || '🗺️'}</span>
        <span style={{ fontSize: '0.75em', color: 'var(--text-2)' }}>{name}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ ...ratio, objectFit: 'cover', display: 'block', background: 'rgba(255,255,255,0.03)' }}
    />
  );
}

function MapCard({ m, event }) {
  const modeName  = m.gameMode?.name || '—';
  const modeColor = m.gameMode?.color || 'var(--text-3)';
  const remaining = event ? timeLeft(event.endTime) : null;

  return (
    <Link
      to={'/mapas/' + m.id}
      className="card"
      style={{
        position: 'relative', overflow: 'hidden', display: 'block',
        color: 'inherit', textDecoration: 'none', cursor: 'pointer',
        border: event ? '1px solid rgba(34,197,94,0.35)' : undefined,
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
      }}
    >
      {event && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.45)',
          borderRadius: 6, padding: '2px 8px',
          fontSize: 10, fontWeight: 700, color: '#22c55e', letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          ACTIVO
        </div>
      )}

      <MapImage src={m.imageUrl} mode={modeName} name={m.name} />

      <div style={{ fontSize: '1.05em', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.35rem' }}>
        {m.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>{MODE_ICONS[modeName] || '🎮'}</span>
        <span style={{ fontSize: '0.85em', fontWeight: 600, color: modeColor }}>{modeName}</span>
      </div>
      {m.environment?.name && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.75em', color: 'var(--text-3)' }}>
          {m.environment.name}
        </div>
      )}
      {remaining && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.75em', color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
          ⏱ {remaining} restante
        </div>
      )}
    </Link>
  );
}

function SectionHeader({ label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        {label}
      </span>
      {count != null && (
        <span style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 999, padding: '1px 8px',
          fontSize: 11, fontWeight: 700, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
        }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function Mapas() {
  const [maps,    setMaps]    = useState([]);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [modeF,   setModeF]   = useState('all');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    Promise.all([
      fetchApi('/brawlers/maps'),
      fetchApi('/events/rotation').catch(() => []),
    ])
      .then(([mapsData, eventsData]) => {
        setMaps(Array.isArray(mapsData) ? mapsData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Mapa de eventId → evento para lookup O(1)
  const eventById = useMemo(() => {
    const m = new Map();
    events.forEach(ev => { if (ev.eventId) m.set(String(ev.eventId), ev); });
    return m;
  }, [events]);

  const modes = useMemo(
    () => ['all', ...new Set(maps.map(m => m.gameMode?.name).filter(Boolean))],
    [maps]
  );

  const filtered = useMemo(() => maps.filter(m => {
    const matchMode   = modeF === 'all' || m.gameMode?.name === modeF;
    const matchSearch = !search || (m.name || '').toLowerCase().includes(search.toLowerCase());
    return matchMode && matchSearch;
  }), [maps, modeF, search]);

  const activeMaps  = filtered.filter(m => eventById.has(String(m.id)));
  const restMaps    = filtered.filter(m => !eventById.has(String(m.id)));

  return (
    <Layout>
      <Topbar title="Mapas" />
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Controles */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
            <input
              className="form-input"
              placeholder="Buscar mapa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <span style={{ color: 'var(--text-2)', fontSize: '0.9em', whiteSpace: 'nowrap' }}>
              {filtered.length} mapas
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {modes.map(m => (
              <button
                key={m}
                className={'btn btn-sm' + (modeF === m ? ' btn-primary' : '')}
                style={modeF !== m ? { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' } : {}}
                onClick={() => setModeF(m)}
              >
                {m === 'all' ? 'Todos' : m}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner" />
          </div>
        ) : maps.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.5rem' }}>Sin mapas disponibles</h3>
            <p style={{ color: 'var(--text-2)' }}>No se han podido cargar los mapas en este momento.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: '2rem' }}>
            No se encontraron mapas con esos filtros.
          </p>
        ) : (
          <>
            {/* Sección: En rotación ahora */}
            {activeMaps.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <SectionHeader label="En rotación ahora" count={activeMaps.length} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '1rem' }}>
                  {activeMaps.map(m => (
                    <MapCard key={m.id} m={m} event={eventById.get(String(m.id))} />
                  ))}
                </div>
              </div>
            )}

            {/* Sección: Resto de mapas */}
            {restMaps.length > 0 && (
              <div>
                <SectionHeader
                  label={activeMaps.length > 0 ? 'Resto de mapas' : 'Todos los mapas'}
                  count={restMaps.length}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '1rem' }}>
                  {restMaps.map(m => (
                    <MapCard key={m.id} m={m} event={null} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
