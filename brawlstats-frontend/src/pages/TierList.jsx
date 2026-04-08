import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

function BrawlerTile({ id, name, winRate, games }) {
  const [failed, setFailed] = useState(false);
  const wrColor =
    winRate == null     ? 'var(--text-3)' :
    winRate >= 60       ? '#EF4444' :
    winRate >= 55       ? '#F59E0B' :
    winRate >= 50       ? '#22C55E' :
    winRate >= 45       ? '#3B82F6' :
                          '#8B5CF6';
  const wrLabel = winRate != null ? winRate + '%' : '—';
  const tip     = winRate != null
    ? `${name} · ${winRate}% WR (${games} partidas)`
    : games > 0
      ? `${name} · ${games} partida(s), muestra insuficiente`
      : `${name} · sin partidas en este modo`;
  const tile = {
    width: 60, borderRadius: 'var(--r-md)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'var(--transition)',
    padding: '4px 2px', overflow: 'hidden',
  };
  return (
    <div
      title={tip}
      style={tile}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {(!failed && id != null) ? (
        <img
          src={`https://cdn.brawlify.com/brawlers/borders/${id}.png`}
          alt={name}
          width={48}
          height={48}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: 8, textAlign: 'center', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          {name.substring(0, 5)}
        </span>
      )}
      <span style={{
        fontSize: 10, fontWeight: 700, marginTop: 2,
        color: wrColor, fontFamily: 'var(--font-mono)',
      }}>
        {wrLabel}
      </span>
    </div>
  );
}

const TIER_STYLES = {
  s: { bg: 'rgba(239,68,68,0.2)',   color: '#EF4444', border: 'rgba(239,68,68,0.3)'  },
  a: { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  b: { bg: 'rgba(34,197,94,0.2)',   color: '#22C55E', border: 'rgba(34,197,94,0.3)'  },
  c: { bg: 'rgba(59,130,246,0.2)',  color: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
  d: { bg: 'rgba(139,92,246,0.2)',  color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
  '?': { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8', border: 'rgba(148,163,184,0.2)' },
};

const MODES = ['Global','Gem Grab','Brawl Ball','Showdown','Hot Zone','Knockout','Heist','Bounty'];

const tierRowStyle = { display: 'flex', alignItems: 'stretch', gap: 'var(--s3)', marginBottom: 'var(--s3)' };
const tierLabelStyle = (t) => ({
  width: 56, minHeight: 56, borderRadius: 'var(--r-md)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, flexShrink: 0,
  background: TIER_STYLES[t].bg, color: TIER_STYLES[t].color,
  border: `1px solid ${TIER_STYLES[t].border}`,
});
const tierSlotsStyle = {
  flex: 1, display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', alignItems: 'center',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)', padding: 'var(--s3)', minHeight: 64,
};

// Reglas de tier basadas en winrate
// Brawlers sin datos van a un tier separado '?' (no se mezclan con tier D real)
function tierOf(winRate) {
  if (winRate == null)  return '?';
  if (winRate >= 60)    return 's';
  if (winRate >= 55)    return 'a';
  if (winRate >= 50)    return 'b';
  if (winRate >= 45)    return 'c';
  return 'd';
}

export default function TierList() {
  const [mode,    setMode]    = useState('Global');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    const qs  = mode && mode !== 'Global' ? '?mode=' + encodeURIComponent(mode) : '';
    fetchApi('/brawlers/winrates' + qs)
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode]);

  const tiers = useMemo(() => {
    const groups = { s: [], a: [], b: [], c: [], d: [], '?': [] };
    for (const b of data) groups[tierOf(b.winRate)].push(b);
    const sortFn = (x, y) => {
      if (x.winRate == null && y.winRate == null) return (x.name || '').localeCompare(y.name || '');
      if (x.winRate == null) return 1;
      if (y.winRate == null) return -1;
      if (y.winRate !== x.winRate) return y.winRate - x.winRate;
      return (y.games || 0) - (x.games || 0);
    };
    for (const k of Object.keys(groups)) groups[k].sort(sortFn);
    return groups;
  }, [data]);

  const totalConDatos  = data.filter(b => b.winRate != null).length;
  const totalPartidas  = data.reduce((s, b) => s + (b.games || 0), 0);

  return (
    <Layout>
      <Topbar
        title="Tier List"
        actions={
          <div className="flex gap-2">
            <div className="api-status"><div className="api-dot online" /> API online</div>
            <button className="btn btn-sm btn-secondary">Compartir</button>
          </div>
        }
      />
      <div className="page">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="t-h2 mb-1">Tier List — Temporada actual</h1>
            <p className="t-sm text-3">
              Win rate global agregado de TODAS las partidas en la base de datos (no de tu cuenta)
              {' · '}
              <span style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>
                Modo: {mode}
              </span>
              {totalPartidas > 0 && (
                <>{' · '}<span style={{ fontFamily: 'var(--font-mono)' }}>{totalPartidas.toLocaleString()} partidas analizadas</span></>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="badge badge-info">Meta actual</span>
            <button className="btn btn-sm btn-secondary">Exportar imagen</button>
          </div>
        </div>

        {/* Filtro modo */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-label" style={{ marginRight: 'var(--s2)' }}>Modo:</span>
            {MODES.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--r-md)', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                  border: '1px solid var(--border)',
                  background: mode === m ? 'var(--blue-dim)' : 'transparent',
                  color: mode === m ? 'var(--blue)' : 'var(--text-2)',
                  borderColor: mode === m ? 'var(--blue-border)' : 'var(--border)',
                }}
              >{m}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card mb-4" style={{ borderColor:'#ef4444', color:'#ef4444' }}>
            {error}
          </div>
        )}

        {/* Tier list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Clasificación por rendimiento</span>
            <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>
              {loading
                ? 'Cargando...'
                : `${data.length} brawlers · ${totalConDatos} con datos`}
            </span>
          </div>
          {loading ? (
            <p className="t-sm text-3" style={{ padding:'2rem', textAlign:'center' }}>
              Cargando winrates...
            </p>
          ) : data.length === 0 ? (
            <p className="t-sm text-3" style={{ padding:'2rem', textAlign:'center' }}>
              Aún no hay brawlers sincronizados. Un administrador debe ejecutar la sincronización.
            </p>
          ) : (
            ['s','a','b','c','d','?'].map(tier => (
              <div key={tier} style={tierRowStyle}>
                <div style={tierLabelStyle(tier)}>{tier === '?' ? '?' : tier.toUpperCase()}</div>
                <div style={tierSlotsStyle}>
                  {tiers[tier].length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {tier === '?' ? 'Todos los brawlers tienen datos.' : 'Sin brawlers en este tier.'}
                    </span>
                  ) : (
                    tiers[tier].map(b => (
                      <BrawlerTile
                        key={b.id ?? b.name}
                        id={b.id}
                        name={b.name}
                        winRate={b.winRate}
                        games={b.games}
                      />
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Leyenda */}
        <div className="card mt-4">
          <div className="card-header"><span className="card-title">Leyenda</span></div>
          <div className="grid cols-4" style={{ gap: 'var(--s3)' }}>
            {[
              { t: 's', label: 'Meta dominante', sub: 'Win rate ≥ 60%' },
              { t: 'a', label: 'Muy fuerte',     sub: 'Win rate 55–60%' },
              { t: 'b', label: 'Viable',         sub: 'Win rate 50–55%' },
              { t: 'c', label: 'Situacional',    sub: 'Win rate 45–50%' },
            ].map(({ t, label, sub }) => (
              <div key={t} className="flex items-center gap-3">
                <div style={{ ...tierLabelStyle(t), width: 40, height: 40, fontSize: 18 }}>{t.toUpperCase()}</div>
                <div>
                  <div className="t-sm text-1">{label}</div>
                  <div className="t-xs text-3">{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="t-xs text-3" style={{ marginTop: 'var(--s3)' }}>
            Los brawlers con menos del 45% de winrate aparecen en el tier D.
            Los brawlers con menos de <strong>5 partidas</strong> en el dataset
            o sin partidas para el modo seleccionado aparecen en el tier <strong>?</strong>
            (muestra insuficiente para un winrate fiable).
          </p>
          <p className="t-xs text-3" style={{ marginTop: 'var(--s2)', color: 'var(--text-3)' }}>
            <strong>¿Tier list vacía o pobre?</strong> Un administrador puede ejecutar
            <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4, margin: '0 4px' }}>
              POST /api/v1/players/sync-top
            </code>
            para poblar la BBDD con los battle logs de los top jugadores globales de Brawl Stars.
          </p>
        </div>

      </div>
    </Layout>
  );
}
