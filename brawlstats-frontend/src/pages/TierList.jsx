import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

const MODES = ['Gem Grab', 'Brawl Ball', 'Hot Zone', 'Knockout', 'Heist', 'Bounty'];

function tierOf(wr) {
  if (wr == null) return '?';
  if (wr >= 65) return 's';
  if (wr >= 60) return 'a';
  if (wr >= 55) return 'b';
  if (wr >= 50) return 'c';
  if (wr >= 45) return 'd';
  return 'f';
}

const TIER_STYLES = {
  s:   { bg: 'rgba(239,68,68,0.2)',     color: '#EF4444', border: 'rgba(239,68,68,0.3)'   },
  a:   { bg: 'rgba(245,158,11,0.2)',    color: '#F59E0B', border: 'rgba(245,158,11,0.3)'  },
  b:   { bg: 'rgba(34,197,94,0.2)',     color: '#22C55E', border: 'rgba(34,197,94,0.3)'   },
  c:   { bg: 'rgba(59,130,246,0.2)',    color: '#3B82F6', border: 'rgba(59,130,246,0.3)'  },
  d:   { bg: 'rgba(139,92,246,0.2)',    color: '#8B5CF6', border: 'rgba(139,92,246,0.3)'  },
  f:   { bg: 'rgba(107,114,128,0.2)',   color: '#6B7280', border: 'rgba(107,114,128,0.3)' },
  '?': { bg: 'rgba(148,163,184,0.12)',  color: '#94A3B8', border: 'rgba(148,163,184,0.2)' },
};

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

function BrawlerTile({ brawlerId, name, winRate, totalGames }) {
  const [failed, setFailed] = useState(false);
  const wrColor =
    winRate == null ? 'var(--text-3)' :
    winRate >= 65   ? '#EF4444' :
    winRate >= 60   ? '#F59E0B' :
    winRate >= 55   ? '#22C55E' :
    winRate >= 50   ? '#3B82F6' :
    winRate >= 45   ? '#8B5CF6' :
                      '#6B7280';
  const wrLabel = winRate != null ? winRate + '%' : '—';
  const gamesLabel = totalGames != null ? `${totalGames} P` : '—';
  const tip = winRate != null
    ? `${name} · ${winRate}% WR · ${totalGames} partidas`
    : `${name} · sin datos para este modo`;
  const tile = {
    width: 64, borderRadius: 'var(--r-md)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'var(--transition)',
    padding: '4px 2px', overflow: 'hidden',
  };
  return (
    <Link
      to={brawlerId != null ? '/brawlers/' + brawlerId : '#'}
      title={tip}
      style={{ ...tile, textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {(!failed && brawlerId != null) ? (
        <img
          src={`https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`}
          alt={name}
          width={48}
          height={48}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          {(name || '').substring(0, 5)}
        </span>
      )}
      <span style={{
        fontSize: 10, fontWeight: 700, marginTop: 2,
        color: wrColor, fontFamily: 'var(--font-mono)',
      }}>
        {wrLabel}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 500, marginTop: 1,
        color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
      }}>
        {gamesLabel}
      </span>
    </Link>
  );
}

export default function TierList() {
  const [mode,    setMode]    = useState(MODES[0]);
  const [data,    setData]    = useState([]);     // [{ brawlerId, name, totalGames, wins, losses, winRate }]
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    const qs = mode ? `?mode=${encodeURIComponent(mode)}` : '';
    fetchApi('/stats/tierlist' + qs)
      .then(res => {
        if (!alive) return;
        setData(Array.isArray(res) ? res : []);
      })
      .catch(err => { if (alive) setError(err.message || 'Error cargando tier list'); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [mode]);

  const tiers = useMemo(() => {
    const groups = { s: [], a: [], b: [], c: [], d: [], f: [], '?': [] };
    for (const b of data) groups[tierOf(b.winRate)].push(b);
    const sortFn = (x, y) => {
      if (y.winRate !== x.winRate) return y.winRate - x.winRate;
      return (y.totalGames || 0) - (x.totalGames || 0);
    };
    for (const k of Object.keys(groups)) groups[k].sort(sortFn);
    return groups;
  }, [data]);

  const isEmpty = !loading && data.length === 0 && !error;

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
              Win rate calculado desde las partidas registradas en la BD
              {' · '}
              <span style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>
                Modo: {mode}
              </span>
              {!loading && data.length > 0 && (
                <>{' · '}<span style={{ fontFamily: 'var(--font-mono)' }}>
                  {data.length} brawlers
                </span></>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="badge badge-info">Meta actual</span>
            <button className="btn btn-sm btn-secondary">Exportar imagen</button>
          </div>
        </div>

        {/* Filtros de modo */}
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
          <div className="card mb-4" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
            <p className="t-sm text-3">Cargando tier list...</p>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3 style={{ color: 'var(--text-1)', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
              Sin datos suficientes
            </h3>
            <p className="t-sm text-3" style={{ maxWidth: 460, margin: '0 auto' }}>
              No hay suficientes partidas registradas. Sincroniza tu cuenta para
              generar datos de tier list.
            </p>
          </div>
        )}

        {/* Tier list */}
        {!loading && data.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Clasificación por rendimiento</span>
              <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>
                {data.length} brawlers con ≥ 5 partidas en {mode}
              </span>
            </div>
            {['s', 'a', 'b', 'c', 'd', 'f', '?'].map(tier => (
              <div key={tier} style={tierRowStyle}>
                <div style={tierLabelStyle(tier)}>{tier === '?' ? '?' : tier.toUpperCase()}</div>
                <div style={tierSlotsStyle}>
                  {tiers[tier].length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {tier === '?' ? 'Sin datos suficientes' : 'Sin brawlers en este tier.'}
                    </span>
                  ) : (
                    tiers[tier].map(b => (
                      <BrawlerTile
                        key={b.brawlerId ?? b.name}
                        brawlerId={b.brawlerId}
                        name={b.name}
                        winRate={b.winRate}
                        totalGames={b.totalGames}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leyenda */}
        {!loading && data.length > 0 && (
          <div className="card mt-4">
            <div className="card-header"><span className="card-title">Leyenda</span></div>
            <div className="grid cols-3" style={{ gap: 'var(--s3)' }}>
              {[
                { t: 's', label: 'Meta dominante', sub: 'Win rate ≥ 65%' },
                { t: 'a', label: 'Muy fuerte',     sub: 'Win rate 60–64%' },
                { t: 'b', label: 'Sólido',         sub: 'Win rate 55–59%' },
                { t: 'c', label: 'Viable',         sub: 'Win rate 50–54%' },
                { t: 'd', label: 'Situacional',    sub: 'Win rate 45–49%' },
                { t: 'f', label: 'Flojo',          sub: 'Win rate < 45%' },
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
              Solo se muestran brawlers con al menos <strong>5 partidas</strong> en
              el modo seleccionado. El win rate se calcula como
              <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4, margin: '0 4px' }}>
                wins / (wins + losses)
              </code>.
            </p>
          </div>
        )}

      </div>
    </Layout>
  );
}
