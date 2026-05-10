import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';
import { AuthContext } from '../App';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const TAG_REGEX   = /^#[0-9A-Z]{6,9}$/i;
const CDN_ICON    = (id) => `https://cdn.brawlify.com/profile-icons/regular/${id}.png`;
const CDN_BRAWLER = (id) => `https://cdn.brawlify.com/brawlers/borders/${id}.png`;

const fmt = (v) => typeof v === 'number' ? v.toLocaleString('es-ES') : (v ?? '—');

function fmtDiff(v1, v2) {
  const d = v1 - v2;
  if (d === 0) return { text: '==', color: 'var(--text-3)' };
  const abs = Math.abs(d);
  const str = abs >= 1000 ? '+' + (abs / 1000).toFixed(1) + 'K' : '+' + abs;
  return { text: d > 0 ? str : str.replace('+', '-'), color: '#22c55e' };
}

/* Extrae las 10 stats comparables desde el raw de Supercell */
function getStats(p) {
  if (!p) return null;
  const brawlers = p.brawlers || [];
  return {
    trophies:    p.trophies          || 0,
    maxTrophies: p.highestTrophies   || 0,
    expLevel:    p.expLevel          || 0,
    v3v3:        p['3vs3Victories']  || 0,
    vSolo:       p.soloVictories     || 0,
    vDuo:        p.duoVictories      || 0,
    bTotal:      brawlers.length,
    b9plus:      brawlers.filter(b => b.power >= 9).length,
    b11:         brawlers.filter(b => b.power === 11).length,
    b500:        brawlers.filter(b => b.trophies >= 500).length,
  };
}

const STAT_DEFS = [
  { key: 'trophies',    label: 'Trofeos totales'      },
  { key: 'maxTrophies', label: 'Máximo histórico'      },
  { key: 'expLevel',    label: 'Nivel de experiencia'  },
  { key: 'v3v3',        label: 'Victorias 3v3'         },
  { key: 'vSolo',       label: 'Victorias Solo'        },
  { key: 'vDuo',        label: 'Victorias Dúo'         },
  { key: 'bTotal',      label: 'Brawlers desbloq.'     },
  { key: 'b9plus',      label: 'Brawlers nivel 9+'     },
  { key: 'b11',         label: 'Brawlers maxeados'     },
  { key: 'b500',        label: 'Brawlers 500+ trof.'   },
];

const RADAR_KEYS = [
  { key: 'trophies',  label: 'Trofeos'      },
  { key: 'v3v3',      label: 'Victor. 3v3'  },
  { key: 'vSolo',     label: 'Victor. Solo' },
  { key: 'bTotal',    label: 'Brawlers'     },
  { key: 'b11',       label: 'Maxeados'     },
  { key: 'expLevel',  label: 'Nivel Exp'    },
];

/* ── Sub-componente: columna de jugador ──────────────────────────────────── */

function PlayerCol({ idx, tag, onTagChange, onSearch, loading, error, tagError, player }) {
  const label = idx === 0 ? 'Jugador 1' : 'Jugador 2';
  const iconId = player?.icon?.id;
  const club   = player?.club?.name || null;

  return (
    <div className="cmp-col">
      {/* Búsqueda */}
      <div className="cmp-search-box">
        <div className="cmp-search-label">{label}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className={'form-input' + (tagError ? ' is-error' : '')}
            placeholder="#XXXXXXXX"
            value={tag}
            onChange={e => onTagChange(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={{ fontFamily: 'var(--font-mono)', flex: 1 }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="btn btn-primary"
            onClick={onSearch}
            disabled={loading}
            style={{ flexShrink: 0 }}
          >
            {loading
              ? <span className="loading-spinner" style={{ width: 14, height: 14 }} />
              : 'Buscar'}
          </button>
        </div>
        {tagError && (
          <div className="form-error">{tagError}</div>
        )}
        {error && (
          <div className="form-error" style={{ marginTop: 6 }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Perfil del jugador */}
      {player && (
        <div className="cmp-profile">
          <PlayerIcon id={iconId} name={player.name} />
          <div className="cmp-profile-info">
            <div className="cmp-profile-name">{player.name}</div>
            {club && <div className="cmp-profile-club">🛡️ {club}</div>}
            <div className="cmp-profile-tag">{player.tag}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerIcon({ id, name, size = 64 }) {
  const [failed, setFailed] = useState(false);
  if (!id || failed) {
    return (
      <div className="cmp-avatar-placeholder" style={{ width: size, height: size }}>
        {(name || '?')[0].toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={CDN_ICON(id)}
      alt={name}
      width={size}
      height={size}
      className="cmp-avatar-img"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

/* ── Sub-componente: fila de stat ────────────────────────────────────────── */

function StatRow({ label, v1, v2, fmt: fmtFn }) {
  const format = fmtFn || fmt;
  const max    = Math.max(v1, v2, 1);
  const pct1   = Math.round((v1 / max) * 100);
  const pct2   = Math.round((v2 / max) * 100);
  const diff   = fmtDiff(v1, v2);

  const col1 = v1 > v2 ? '#22c55e' : v1 < v2 ? '#ef4444' : 'var(--text-1)';
  const col2 = v2 > v1 ? '#22c55e' : v2 < v1 ? '#ef4444' : 'var(--text-1)';

  return (
    <div className="cmp-stat-row">
      {/* J1 valor */}
      <div className="cmp-stat-val cmp-stat-val--left" style={{ color: col1 }}>
        {format(v1)}
      </div>

      {/* Barra izquierda (J1) */}
      <div className="cmp-stat-bar cmp-stat-bar--left">
        <div className="cmp-stat-bar-track">
          <div
            className="cmp-stat-bar-fill cmp-stat-bar-fill--j1"
            style={{ width: pct1 + '%' }}
          />
        </div>
      </div>

      {/* Label central */}
      <div className="cmp-stat-center">
        <div className="cmp-stat-label">{label}</div>
        <div className="cmp-stat-diff" style={{ color: diff.color }}>
          {diff.text}
        </div>
      </div>

      {/* Barra derecha (J2) */}
      <div className="cmp-stat-bar cmp-stat-bar--right">
        <div className="cmp-stat-bar-track">
          <div
            className="cmp-stat-bar-fill cmp-stat-bar-fill--j2"
            style={{ width: pct2 + '%' }}
          />
        </div>
      </div>

      {/* J2 valor */}
      <div className="cmp-stat-val cmp-stat-val--right" style={{ color: col2 }}>
        {format(v2)}
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function Comparador() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [tags,     setTags]     = useState(['', '']);
  const [players,  setPlayers]  = useState([null, null]);
  const [loading,  setLoading]  = useState([false, false]);
  const [errors,   setErrors]   = useState([null, null]);
  const [tagErrs,  setTagErrs]  = useState([null, null]);
  const [showAll,  setShowAll]  = useState(false);
  const [copyOk,   setCopyOk]   = useState(false);
  const [myPlayer, setMyPlayer] = useState(null);

  /* ── Cargar jugador autenticado (solo tag) ── */
  useEffect(() => {
    if (!user) return;
    fetchApi('/players/me')
      .then(p => p?.tag ? setMyPlayer(p) : null)
      .catch(() => null);
  }, [user]);

  /* ── Buscar jugador por tag ── */
  const searchPlayer = useCallback(async (idx, rawTag) => {
    const tag = (rawTag || tags[idx]).trim().toUpperCase();
    if (!TAG_REGEX.test(tag)) {
      setTagErrs(prev => prev.map((e, i) => i === idx ? 'Tag inválido (ej: #ABCD1234)' : e));
      return;
    }
    setTagErrs(prev => prev.map((e, i) => i === idx ? null : e));
    setLoading(prev => prev.map((v, i) => i === idx ? true : v));
    setErrors(prev =>  prev.map((e, i) => i === idx ? null : e));
    try {
      const p = await fetchApi('/players/search?tag=' + encodeURIComponent(tag));
      setPlayers(prev => prev.map((v, i) => i === idx ? p : v));
    } catch (err) {
      setErrors(prev =>  prev.map((e, i) => i === idx ? (err.message || 'Jugador no encontrado') : e));
      setPlayers(prev => prev.map((v, i) => i === idx ? null : v));
    } finally {
      setLoading(prev => prev.map((v, i) => i === idx ? false : v));
    }
  }, [tags]);

  /* ── Leer query params j1/j2 al montar ── */
  useEffect(() => {
    const j1 = searchParams.get('j1');
    const j2 = searchParams.get('j2');
    if (j1) { setTags(t => [j1, t[1]]); searchPlayer(0, j1); }
    if (j2) { setTags(t => [t[0], j2]); searchPlayer(1, j2); }
  }, []); // eslint-disable-line

  const handleTagChange = (idx, val) => {
    setTags(prev => prev.map((t, i) => i === idx ? val : t));
    setTagErrs(prev => prev.map((e, i) => i === idx ? null : e));
  };

  const handleLoadMyPlayer = () => {
    if (!myPlayer?.tag) return;
    const tag = myPlayer.tag;
    setTags(prev => [tag, prev[1]]);
    searchPlayer(0, tag);
  };

  /* ── Compartir URL ── */
  const handleShare = () => {
    const p1 = players[0], p2 = players[1];
    if (!p1 && !p2) return;
    const params = new URLSearchParams();
    if (p1?.tag) params.set('j1', p1.tag);
    if (p2?.tag) params.set('j2', p2.tag);
    const url = window.location.origin + '/comparador?' + params.toString();
    navigator.clipboard.writeText(url).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2500);
    });
  };

  /* ── Derivados ── */
  const p1 = players[0], p2 = players[1];
  const bothLoaded = !!(p1 && p2);

  const stats1 = useMemo(() => getStats(p1), [p1]);
  const stats2 = useMemo(() => getStats(p2), [p2]);

  /* Resultado de cada stat */
  const statResults = useMemo(() => {
    if (!stats1 || !stats2) return { j1: 0, j2: 0, ties: 0 };
    let j1 = 0, j2 = 0, ties = 0;
    for (const { key } of STAT_DEFS) {
      const v1 = stats1[key], v2 = stats2[key];
      if (v1 > v2) j1++;
      else if (v2 > v1) j2++;
      else ties++;
    }
    return { j1, j2, ties };
  }, [stats1, stats2]);

  /* Brawlers en común */
  const commonBrawlers = useMemo(() => {
    if (!p1 || !p2) return [];
    const b2Map = new Map((p2.brawlers || []).map(b => [b.id, b]));
    return (p1.brawlers || [])
      .filter(b => b2Map.has(b.id))
      .map(b1 => {
        const b2 = b2Map.get(b1.id);
        return {
          id:   b1.id,
          name: b1.name,
          t1:   b1.trophies,
          t2:   b2.trophies,
          diff: b1.trophies - b2.trophies,
        };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [p1, p2]);

  const visibleBrawlers = showAll ? commonBrawlers : commonBrawlers.slice(0, 20);

  /* Radar data (normalizado 0-100) */
  const radarData = useMemo(() => {
    if (!stats1 || !stats2) return [];
    return RADAR_KEYS.map(({ key, label }) => {
      const v1 = stats1[key], v2 = stats2[key];
      const max = Math.max(v1, v2, 1);
      return {
        subject: label,
        A: Math.round((v1 / max) * 100),
        B: Math.round((v2 / max) * 100),
        full: 100,
      };
    });
  }, [stats1, stats2]);

  /* ── Render ── */
  return (
    <Layout>
      <Topbar title="Comparador de jugadores" />
      <div className="page">

        {/* ── Sección 1: Buscadores ── */}
        <div className="cmp-top-grid">

          <PlayerCol
            idx={0}
            tag={tags[0]}
            onTagChange={v => handleTagChange(0, v)}
            onSearch={() => searchPlayer(0)}
            loading={loading[0]}
            error={errors[0]}
            tagError={tagErrs[0]}
            player={p1}
          />

          {/* VS central */}
          <div className="cmp-vs-wrap">
            <div className={'cmp-vs' + (bothLoaded ? ' cmp-vs--ready' : '')}>VS</div>
            {myPlayer?.tag && !players[0] && (
              <button className="btn btn-sm btn-secondary cmp-my-btn" onClick={handleLoadMyPlayer}>
                Mis stats →
              </button>
            )}
          </div>

          <PlayerCol
            idx={1}
            tag={tags[1]}
            onTagChange={v => handleTagChange(1, v)}
            onSearch={() => searchPlayer(1)}
            loading={loading[1]}
            error={errors[1]}
            tagError={tagErrs[1]}
            player={p2}
          />
        </div>

        {/* ── Secciones que solo aparecen con ambos jugadores ── */}
        {bothLoaded && stats1 && stats2 && (
          <>
            {/* ── Sección 3: Comparativa de stats ── */}
            <div className="card" style={{ marginBottom: 'var(--s5)' }}>
              <div className="card-header">
                <span className="card-title">Comparativa de estadísticas</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {p1.name} vs {p2.name}
                </span>
              </div>

              {/* Labels de cabecera */}
              <div className="cmp-stat-header">
                <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 12 }}>{p1.name}</span>
                <span />
                <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>STAT</span>
                <span />
                <span style={{ color: '#f97316', fontWeight: 700, fontSize: 12, textAlign: 'right' }}>{p2.name}</span>
              </div>

              <div className="cmp-stats-list">
                {STAT_DEFS.map(({ key, label }) => (
                  <StatRow
                    key={key}
                    label={label}
                    v1={stats1[key]}
                    v2={stats2[key]}
                  />
                ))}
              </div>
            </div>

            {/* ── Sección 4: Barra de victorias global ── */}
            <div className="card" style={{ marginBottom: 'var(--s5)' }}>
              <div className="card-header">
                <span className="card-title">Resultado global</span>
              </div>
              <div className="cmp-win-bar-labels">
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>{p1.name}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                  {statResults.j1}W — {statResults.ties} empates — {statResults.j2}W
                </span>
                <span style={{ color: '#f97316', fontWeight: 700, textAlign: 'right' }}>{p2.name}</span>
              </div>
              <div className="cmp-win-bar">
                <div
                  className="cmp-win-bar-j1"
                  style={{ flex: statResults.j1 + 0.001 }}
                />
                {statResults.ties > 0 && (
                  <div
                    className="cmp-win-bar-tie"
                    style={{ flex: statResults.ties }}
                  />
                )}
                <div
                  className="cmp-win-bar-j2"
                  style={{ flex: statResults.j2 + 0.001 }}
                />
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                {statResults.j1 > statResults.j2
                  ? <><strong style={{ color: '#3b82f6' }}>{p1.name}</strong> domina la comparativa ({statResults.j1}/{STAT_DEFS.length} stats)</>
                  : statResults.j2 > statResults.j1
                    ? <><strong style={{ color: '#f97316' }}>{p2.name}</strong> domina la comparativa ({statResults.j2}/{STAT_DEFS.length} stats)</>
                    : <span>Empate perfecto — {statResults.ties} stats igualadas</span>
                }
              </div>
            </div>

            {/* ── Sección 5: Brawlers en común ── */}
            {commonBrawlers.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--s5)' }}>
                <div className="card-header">
                  <span className="card-title">
                    Brawlers en común ({commonBrawlers.length})
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Brawler</th>
                        <th style={{ color: '#3b82f6' }}>{p1.name}</th>
                        <th style={{ color: '#f97316' }}>{p2.name}</th>
                        <th className="cmp-hide-mobile">Diferencia</th>
                        <th>Ganador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleBrawlers.map(b => {
                        const diff  = b.diff;
                        const winner = diff > 0 ? p1.name : diff < 0 ? p2.name : null;
                        const wCol   = diff > 0 ? '#3b82f6' : diff < 0 ? '#f97316' : 'var(--text-3)';
                        const absD   = Math.abs(diff);
                        return (
                          <tr key={b.id}>
                            <td>
                              <Link to={'/brawlers/' + b.id} className="table-player">
                                <div className="table-avatar">
                                  <BrawlerImg id={b.id} name={b.name} />
                                </div>
                                <span className="table-name">{b.name}</span>
                              </Link>
                            </td>
                            <td className="table-num" style={{ color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--text-1)' }}>
                              {b.t1.toLocaleString('es-ES')}
                            </td>
                            <td className="table-num" style={{ color: diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : 'var(--text-1)' }}>
                              {b.t2.toLocaleString('es-ES')}
                            </td>
                            <td className="cmp-hide-mobile" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: diff !== 0 ? '#22c55e' : 'var(--text-3)' }}>
                              {diff !== 0 ? (diff > 0 ? '+' : '') + absD.toLocaleString('es-ES') : '=='}
                            </td>
                            <td>
                              {winner
                                ? <span style={{ color: wCol, fontWeight: 700, fontSize: 12 }}>{winner} ✓</span>
                                : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Empate</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {commonBrawlers.length > 20 && (
                  <div style={{ textAlign: 'center', marginTop: 'var(--s4)' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAll(v => !v)}
                    >
                      {showAll
                        ? 'Mostrar menos'
                        : `Ver todos (${commonBrawlers.length - 20} más)`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Sección 6: Radar chart ── */}
            {radarData.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--s5)' }}>
                <div className="card-header">
                  <span className="card-title">Gráfico comparativo</span>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--font-body)' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-3)', fontSize: 10 }}
                      tickCount={4}
                    />
                    <Radar
                      name={p1.name}
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Radar
                      name={p2.name}
                      dataKey="B"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Legend
                      wrapperStyle={{ color: 'var(--text-2)', fontSize: 13, paddingTop: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text-1)',
                        fontSize: 12,
                      }}
                      formatter={(val, name) => [val + '%', name]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Sección 7: Compartir ── */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
              <button
                className={'btn btn-secondary' + (copyOk ? ' btn-success' : '')}
                onClick={handleShare}
                style={{ minWidth: 220 }}
              >
                {copyOk ? '✓ URL copiada al portapapeles' : '🔗 Compartir comparación'}
              </button>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                /comparador?j1={p1.tag}&j2={p2.tag}
              </div>
            </div>
          </>
        )}

        {/* Estado vacío inicial */}
        {!p1 && !p2 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--s12) var(--s8)', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              Introduce dos tags de jugador para comparar
            </div>
            <div style={{ fontSize: 12 }}>
              El tag debe empezar por # y tener entre 6 y 9 caracteres alfanuméricos
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

/* ── Brawler image con fallback ────────────────────────────────────────────── */
function BrawlerImg({ id, name }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{(name || '?').slice(0, 2)}</span>;
  return (
    <img
      src={CDN_BRAWLER(id)}
      alt={name}
      width={32}
      height={32}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );
}
