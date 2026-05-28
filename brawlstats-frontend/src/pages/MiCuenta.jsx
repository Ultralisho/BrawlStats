import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';
import { AuthContext } from '../App';

// IDs propios de brawlify CDN (api.brawlapi.com/v1/game-modes → campo id)
// Son IDs secuenciales de su propia BD, distintos de los IDs de Supercell (15000xxx)
const MODE_BRAWLAPI_ID = {
  gemGrab:      1,
  showdown:     2,
  brawlBall:    3,
  soloShowdown: 4,
  duoShowdown:  5,
  bounty:       6,
  heist:        7,
  siege:        9,
  hotZone:      17,
  basketBrawl:  23,
  duels:        24,
  wipeout:      38,
  knockout:     39,
  paintBrawl:   49,
  trioShowdown: 51,
};

const MODE_EMOJI = {
  gemGrab: '💎', brawlBall: '⚽', showdown: '💀', soloShowdown: '💀',
  duoShowdown: '💀', hotZone: '🔥', knockout: '🥊', bounty: '⭐',
  heist: '💰', duels: '⚔️', wipeout: '🔫', basketBrawl: '🏀',
  siege: '🛡️', paintBrawl: '🎨', trioShowdown: '💀',
};

function modeIconUrl(mode) {
  const id = MODE_BRAWLAPI_ID[mode];
  if (!id) return null;
  return 'https://cdn.brawlify.com/game-modes/regular/' + id + '.png';
}

export default function MiCuenta() {
  const { user, login, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [player,    setPlayer]    = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [noPlayer,  setNoPlayer]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);

  const [tab,        setTab]        = useState('stats');
  const [iconFailed, setIconFailed] = useState(false);

  const [tagInput,  setTagInput]  = useState('');
  const [linking,   setLinking]   = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [syncing,   setSyncing]   = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name,    setName]    = useState(user?.name    || '');
  const [country, setCountry] = useState(user?.country || '');
  const [saving,  setSaving]  = useState(false);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [meRes, playerRes] = await Promise.allSettled([
          fetchApi('/auth/me'),
          fetchApi('/players/me'),
        ]);
        if (!alive) return;

        if (meRes.status === 'fulfilled') {
          setName(meRes.value.name || '');
          setCountry(meRes.value.country || '');
        }

        if (playerRes.status === 'rejected') {
          if (playerRes.reason?.message?.includes('vinculado')) setNoPlayer(true);
          else setError(playerRes.reason?.message);
        } else {
          setPlayer(playerRes.value);
          const log = await fetchApi('/stats/battlelog').catch(() => []);
          if (!alive) return;
          setBattleLog(Array.isArray(log) ? log : []);
        }
      } catch (err) {
        if (!alive) return;
        if (err.message && err.message.includes('vinculado')) setNoPlayer(true);
        else setError(err.message);
      } finally { if (alive) setLoading(false); }
    };
    load();
    return () => { alive = false; };
  }, []);

  const handleLinkPlayer = async (e) => {
    e.preventDefault();
    setLinking(true); setError(null);
    try {
      const p = await fetchApi('/players', { method: 'POST', body: { tag: tagInput.trim() } });
      setPlayer(p); setNoPlayer(false); setTagInput('');
      setSuccess('Jugador vinculado correctamente.');
      const log = await fetchApi('/stats/battlelog').catch(() => []);
      setBattleLog(Array.isArray(log) ? log : []);
    } catch (err) { setError(err.message); }
    finally { setLinking(false); }
  };

  const handleUnlink = async () => {
    if (!window.confirm('¿Desvincular ' + (player?.tag || '') + ' de tu cuenta?')) return;
    setUnlinking(true); setError(null); setSuccess(null);
    try {
      await fetchApi('/players/me', { method: 'DELETE' });
      setPlayer(null); setBattleLog([]); setNoPlayer(true);
      setSuccess('Jugador desvinculado.');
    } catch (err) { setError(err.message); }
    finally { setUnlinking(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setError(null); setSuccess(null);
    try {
      await fetchApi('/players/sync', { method: 'POST' });
      const p = await fetchApi('/players/me');
      setPlayer(p);
      const log = await fetchApi('/stats/battlelog').catch(() => []);
      setBattleLog(Array.isArray(log) ? log : []);
      setSuccess('Datos sincronizados con Brawl Stars.');
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      const updated = await fetchApi('/auth/me', { method: 'PUT', body: { name, country } });
      login({ ...user, name: updated.name, country: updated.country });
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true); setError(null); setSuccess(null);
    try {
      await fetchApi('/auth/change-password', { method: 'PUT', body: { currentPassword: curPass, newPassword: newPass } });
      setSuccess('Contraseña actualizada correctamente.');
      setCurPass(''); setNewPass('');
    } catch (err) { setError(err.message); }
    finally { setSavingPw(false); }
  };

  // ── derivados ──
  const raw      = player?.rawData || {};
  const brawlers = useMemo(() => [...(raw.brawlers || [])].sort((a, b) => b.trophies - a.trophies), [raw]);
  const bestBrawler = brawlers[0] || null;

  const totalBrawlers = brawlers.length;
  const lvl9Plus      = brawlers.filter(b => b.power >= 9).length;
  const maxed         = brawlers.filter(b => b.power === 11 && (b.gears || []).length > 0).length;
  const tr500Plus     = brawlers.filter(b => b.trophies >= 500).length;

  // Battle chart: filtrar ranked, invertir a cronológico, acumular trofeos
  const chartData = useMemo(() => {
    const chronological = [...battleLog].reverse();
    const ranked = chronological.filter(b => {
      const d = parseInt(String(b.trophyChange || '0').replace('+', ''), 10) || 0;
      return d !== 0;
    });
    let acc = 0;
    return ranked.map((b, i) => {
      const delta = parseInt(String(b.trophyChange || '0').replace('+', ''), 10) || 0;
      acc += delta;
      return { idx: i + 1, trophies: acc, delta, battle: b };
    });
  }, [battleLog]);

  const chartDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const vals = chartData.map(p => p.trophies);
    return [Math.min(...vals) - 50, Math.max(...vals) + 50];
  }, [chartData]);

  const totalChange = chartData.reduce((s, p) => s + p.delta, 0);

  // ── render: loading ──
  if (loading) return (
    <Layout>
      <Topbar title="Mi Cuenta" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="loading-spinner" style={{ width: 36, height: 36 }} />
        <p style={{ color: 'var(--text-2)' }}>Cargando perfil...</p>
      </div>
    </Layout>
  );

  // ── render: sin jugador vinculado ──
  if (noPlayer || !player) return (
    <Layout>
      <Topbar title="Mi Cuenta" />
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxWidth: '600px' }}>
        {error   && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Vincula tu jugador de Brawl Stars</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem', fontSize: '13px' }}>
            Introduce tu tag de jugador para ver tus estadísticas.
          </p>
          <form onSubmit={handleLinkPlayer} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-input"
              placeholder="#XXXXXXXX"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
            />
            <button type="submit" className="btn btn-primary" disabled={linking || !tagInput.trim()}>
              {linking ? '...' : 'Vincular'}
            </button>
          </form>
        </div>

        <SettingsBlock
          user={user} name={name} setName={setName}
          country={country} setCountry={setCountry}
          saving={saving} onSaveProfile={handleSaveProfile}
          curPass={curPass} setCurPass={setCurPass}
          newPass={newPass} setNewPass={setNewPass}
          savingPw={savingPw} onChangePw={handleChangePassword}
        />
      </div>
    </Layout>
  );

  // ── URLs de cabecera ──
  const iconId       = raw.icon?.id;
  const iconUrl      = iconId ? 'https://cdn.brawlify.com/profile-icons/regular/' + iconId + '.png' : null;
  const clubName     = raw.club?.name || player.club || null;
  const clubBadgeId  = raw.club?.badgeId || null;
  const clubBadgeUrl = clubBadgeId
    ? 'https://cdn.brawlify.com/club-badges/regular/' + clubBadgeId + '.png'
    : null;
  const hasRealIcon  = Boolean(iconUrl && !iconFailed);

  // ── render: con jugador ──
  return (
    <Layout>
      <Topbar title="Mi Cuenta" />
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {error   && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* CABECERA */}
        <div className="mc-header">
          <div className={'mc-header-icon' + (hasRealIcon ? ' has-icon' : ' is-initial')}>
            {hasRealIcon
              ? <img src={iconUrl} alt={player.name} onError={() => setIconFailed(true)} />
              : (player.name || '?').charAt(0).toUpperCase()
            }
          </div>

          <div className="mc-header-info">
            <div className="mc-header-name">{player.name}</div>
            {clubName && (
              <div className="mc-header-club">
                {clubBadgeUrl
                  ? <img
                      src={clubBadgeUrl}
                      alt=""
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  : <span style={{ fontSize: '15px' }}>🛡️</span>
                }
                <span>{clubName}</span>
              </div>
            )}
            <div className="mc-header-tag">{player.tag}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleSync}
              disabled={syncing}
              title="Sincronizar datos con la API de Brawl Stars"
            >
              {syncing
                ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Sincronizando…</>
                : '↺ Sincronizar'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => navigate('/comparador?j1=' + encodeURIComponent(player.tag))}
              title="Comparar con otro jugador"
            >
              ⚔️ Comparar
            </button>
            <button className="mc-header-unsave" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? 'Desvinculando...' : 'Desvincular ' + player.tag}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="mc-tabs">
          {['stats', 'battles', 'brawlers'].map(t => (
            <button
              key={t}
              className={'mc-tab' + (tab === t ? ' is-active' : '')}
              onClick={() => setTab(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── TAB: STATS ── */}
        {tab === 'stats' && (
          <div className="mc-stats-grid">
            {/* Tarjeta Best Brawler */}
            <div className="card mc-best">
              <div className="mc-best-label">BEST BRAWLER</div>
              {bestBrawler ? (
                <>
                  <div className="mc-best-name">{bestBrawler.name}</div>

                  <Link to={'/brawlers/' + bestBrawler.id} className="mc-best-img" title="Ver brawler">
                    <BrawlerImage
                      id={bestBrawler.id}
                      name={bestBrawler.name}
                      height={140}
                    />
                  </Link>

                  <div className="mc-best-power" title={'Power ' + bestBrawler.power}>
                    {bestBrawler.power}
                  </div>

                  {(bestBrawler.starPowers?.length > 0 || bestBrawler.gadgets?.length > 0) && (
                    <div className="mc-best-icons">
                      {bestBrawler.starPowers?.map(sp => (
                        <img
                          key={'sp' + sp.id}
                          src={'https://cdn.brawlify.com/star-powers/regular/' + sp.id + '.png'}
                          alt={sp.name}
                          title={'Star Power: ' + sp.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ))}
                      {bestBrawler.starPowers?.length > 0 && bestBrawler.gadgets?.length > 0 && (
                        <span className="mc-best-icons-sep" aria-hidden="true" />
                      )}
                      {bestBrawler.gadgets?.map(g => (
                        <img
                          key={'g' + g.id}
                          src={'https://cdn.brawlify.com/gadgets/regular/' + g.id + '.png'}
                          alt={g.name}
                          title={'Gadget: ' + g.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mc-best-trophies">
                    <div title="Trofeos actuales">
                      <span style={{ color: 'var(--gold)' }}>🏆</span>
                      {bestBrawler.trophies.toLocaleString()}
                    </div>
                    <div title="Trofeos máximos">
                      <span style={{ color: 'var(--text-3)' }}>🏆</span>
                      {bestBrawler.highestTrophies.toLocaleString()}
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-2)', padding: '2rem 0', fontSize: '13px' }}>
                  Sin brawlers todavía.
                </p>
              )}
            </div>

            {/* Grid 10 StatBoxes */}
            <div className="mc-stat-grid">
              <StatBox icon="🏆" label="Trophies"           value={(raw.trophies        ?? player.trophies        ?? 0).toLocaleString()} />
              <StatBox icon="🏆" label="Highest Trophies"   value={(raw.highestTrophies ?? player.highestTrophies ?? 0).toLocaleString()} />
              <StatBox icon="⬡"  label="Exp Level"          value={raw.expLevel ?? player.level ?? '—'} />
              <StatBox icon="⚔️" label="3 vs 3 Victories"   value={(raw['3vs3Victories'] ?? 0).toLocaleString()} />
              <StatBox icon="💀" label="Solo Victories"     value={(raw.soloVictories ?? 0).toLocaleString()} />
              <StatBox icon="👥" label="Duo Victories"      value={(raw.duoVictories  ?? 0).toLocaleString()} />
              <StatBox icon="🎮" label="Brawlers desbloq."  value={totalBrawlers} total={totalBrawlers} num={totalBrawlers} />
              <StatBox icon="⚡" label="Level 9+"           value={lvl9Plus}      total={totalBrawlers} num={lvl9Plus} />
              <StatBox icon="💎" label="Maxed (Lvl 11)"     value={maxed}         total={totalBrawlers} num={maxed} />
              <StatBox icon="🏆" label="500+ Trofeos"       value={tr500Plus}     total={totalBrawlers} num={tr500Plus} />
            </div>
          </div>
        )}

        {/* ── TAB: BATTLES ── */}
        {tab === 'battles' && (
          <div className="card">
            {chartData.length === 0 ? (
              <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: '2rem', fontSize: '13px' }}>
                Sin batallas recientes con cambio de trofeos.
              </p>
            ) : (
              <>
                <div className="mc-battles-summary">
                  <span>Trofeos de las últimas</span>
                  <span className="mc-count">{chartData.length}</span>
                  <span>batallas ranked:</span>
                  <b className={totalChange < 0 ? 'neg' : ''}>
                    {(totalChange >= 0 ? '+' : '') + totalChange}
                  </b>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 30, right: 12, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="idx" hide />
                    <YAxis domain={chartDomain} hide />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
                    <Tooltip content={<BattleTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                    <Line
                      type="monotone"
                      dataKey="trophies"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      label={p => {
                        const d = chartData[p.index]?.delta;
                        if (d === undefined || d === null) return null;
                        return (
                          <text
                            key={p.index}
                            x={p.x} y={p.y - 12}
                            textAnchor="middle"
                            fontSize="11" fontWeight="700"
                            fill={d >= 0 ? '#22c55e' : '#ef4444'}
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {(d >= 0 ? '+' : '') + d}
                          </text>
                        );
                      }}
                      isAnimationActive
                      animationDuration={500}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mc-battle-row">
                  {chartData.map((p, i) => {
                    const cls = p.battle.result === 'Win'  ? 'win'
                              : p.battle.result === 'Loss' ? 'loss'
                              : 'draw';
                    return (
                      <div
                        key={i}
                        className={'mc-battle-card ' + cls}
                        title={[p.battle.modeLabel || p.battle.mode, p.battle.map, p.battle.brawler, p.battle.result, (p.delta >= 0 ? '+' : '') + p.delta + ' trofeos'].filter(Boolean).join(' · ')}
                      >
                        <ModeIcon mode={p.battle.mode} size={28} />
                        {p.battle.result === 'Loss' && (
                          <span className="mc-battle-skull">💀</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: BRAWLERS ── */}
        {tab === 'brawlers' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Tus brawlers ({brawlers.length})
            </h3>
            {brawlers.length === 0 ? (
              <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>Sin brawlers en tu cuenta.</p>
            ) : (
              <div className="mc-brawlers-grid">
                {brawlers.map(b => (
                  <Link key={b.id} to={'/brawlers/' + b.id} className="mc-brawler-card">
                    <BrawlerImage id={b.id} name={b.name} size={64} />
                    <div className="mc-brawler-card-name">{b.name}</div>
                    <div className="mc-brawler-card-power">⚡ P{b.power}</div>
                    <div className="mc-brawler-card-trophies">
                      🏆 {b.trophies}
                      <span style={{ color: 'var(--text-3)' }}> / {b.highestTrophies}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS (colapsado) */}
        <div className="mc-settings-toggle">
          <button className="btn btn-secondary" onClick={() => setSettingsOpen(o => !o)}>
            {settingsOpen ? '▼ Ocultar ajustes' : '▶ Ajustes de cuenta'}
          </button>
          <button
            className="btn"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-3)' }}
            onClick={() => logout()}
          >
            Cerrar sesión
          </button>
        </div>

        {settingsOpen && (
          <SettingsBlock
            user={user} name={name} setName={setName}
            country={country} setCountry={setCountry}
            saving={saving} onSaveProfile={handleSaveProfile}
            curPass={curPass} setCurPass={setCurPass}
            newPass={newPass} setNewPass={setNewPass}
            savingPw={savingPw} onChangePw={handleChangePassword}
          />
        )}
      </div>
    </Layout>
  );
}

/* ── Componentes auxiliares ─────────────────────────────────────────────── */

function BrawlerImage({ id, name, size = 64, height }) {
  const [failed, setFailed] = useState(false);
  const w = size;
  const h = height || size;

  if (failed) {
    return (
      <div style={{
        width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)',
        color: 'var(--text-3)', fontSize: Math.min(w, h) * 0.22,
        fontWeight: 700, fontFamily: 'var(--font-display)',
        userSelect: 'none',
      }}>
        {(name || '?').slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={'https://cdn.brawlify.com/brawlers/borders/' + id + '.png'}
      alt={name}
      width={w}
      height={h}
      style={{ width: w, height: h, objectFit: 'contain', display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}

function ModeIcon({ mode, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const url = modeIconUrl(mode);

  if (!url || failed) {
    return (
      <span style={{
        width: size, height: size,
        fontSize: Math.round(size * 0.7),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
        {MODE_EMOJI[mode] || '🎮'}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={mode}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  );
}

function StatBox({ icon, label, value, total, num }) {
  const hasBar = typeof total === 'number' && typeof num === 'number' && total > 0;
  return (
    <div className="mc-stat-box">
      <div className="mc-stat-label">
        {icon && <span style={{ fontSize: '13px' }}>{icon}</span>}
        {label}
      </div>
      {hasBar ? (
        <>
          <div className="mc-stat-value">
            {num}
            <span className="mc-stat-frac"> / {total}</span>
          </div>
          <div className="mc-stat-bar">
            <div
              className="mc-stat-bar-fill"
              style={{ width: Math.min(100, Math.round((num / total) * 100)) + '%' }}
            />
          </div>
        </>
      ) : (
        <div className="mc-stat-value">{value}</div>
      )}
    </div>
  );
}

function BattleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const b     = data.battle || {};
  const d     = data.delta ?? 0;
  const isPos = d >= 0;

  return (
    <div style={{
      background: '#0d1f38', border: '1px solid #1e3151', borderRadius: '8px',
      color: '#fff', fontSize: '12px', padding: '8px 10px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
    }}>
      <ModeIcon mode={b.mode} size={20} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontWeight: 700, color: isPos ? '#22c55e' : '#ef4444' }}>
          {b.result || '?'} · {(isPos ? '+' : '') + d} trofeos
        </div>
        <div style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          {b.modeLabel || b.mode || '?'} · {b.map || '—'} · {b.brawler || '—'}
        </div>
      </div>
    </div>
  );
}

function Alert({ type, children }) {
  const s = type === 'error'
    ? { bg: 'rgba(239,68,68,0.12)', bd: '#ef4444', col: '#ef4444' }
    : { bg: 'rgba(34,197,94,0.12)',  bd: '#22c55e', col: '#22c55e' };
  return (
    <div style={{
      background: s.bg, border: '1px solid ' + s.bd, borderRadius: '8px',
      padding: '0.75rem 1rem', marginBottom: '1rem', color: s.col, fontSize: '13px',
    }}>
      {children}
    </div>
  );
}

function SettingsBlock({
  user, name, setName, country, setCountry, saving, onSaveProfile,
  curPass, setCurPass, newPass, setNewPass, savingPw, onChangePw,
}) {
  return (
    <div className="mc-settings-grid">
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Datos personales</h3>
        <form onSubmit={onSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">País</label>
            <input className="form-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="España" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Cambiar contraseña</h3>
        <form onSubmit={onChangePw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input className="form-input" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw || !curPass || !newPass}>
            {savingPw ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
