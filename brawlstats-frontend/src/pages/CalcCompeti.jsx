import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

/* ── Constantes ─────────────────────────────────────────────────────────── */

const MODES = [
  { name: 'Gem Grab',   emoji: '💎' },
  { name: 'Brawl Ball', emoji: '⚽' },
  { name: 'Hot Zone',   emoji: '🔥' },
  { name: 'Knockout',   emoji: '🥊' },
  { name: 'Bounty',     emoji: '⭐' },
  { name: 'Heist',      emoji: '💰' },
];

// Los bans son SIMULTÁNEOS (ambos equipos banean a la vez).
// Solo los picks siguen orden de turno: A, B, B, A, A, B
const PICK_STEPS = [
  { team: 0 }, // pick 1 — Mi equipo
  { team: 1 }, // pick 2 — Rival
  { team: 1 }, // pick 3 — Rival
  { team: 0 }, // pick 4 — Mi equipo
  { team: 0 }, // pick 5 — Mi equipo
  { team: 1 }, // pick 6 — Rival
];

const BAN_SLOTS  = 3; // bans por equipo
const PICK_TOTAL = PICK_STEPS.length;
const STORAGE_KEY = 'bs_compositions_v3';

const initTeam = () => ({ picks: [null, null, null], bans: [null, null, null] });

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const wrColor    = (wr) => wr == null ? 'var(--text-3)' : wr >= 55 ? '#22c55e' : wr >= 45 ? '#facc15' : '#ef4444';
const scoreColor = (s)  => s  == null ? 'var(--text-3)' : s  >= 60 ? '#22c55e' : s  >= 50 ? '#facc15' : '#ef4444';
const scoreLabel = (s)  =>
  s == null ? '—' : s >= 60 ? 'COMP. FUERTE' : s >= 50 ? 'COMP. VIABLE' : s >= 40 ? 'COMP. DÉBIL' : 'COMP. MUY DÉBIL';

const brawlerImg = (id) => `https://cdn.brawlify.com/brawlers/borders/${id}.png`;

/* ── Componente principal ────────────────────────────────────────────────── */

export default function CalcCompeti() {

  /* ── Datos ── */
  const [brawlers,   setBrawlers]   = useState([]);
  const [winrates,   setWinrates]   = useState([]);
  const [allMaps,    setAllMaps]    = useState([]);
  const [mapStats,   setMapStats]   = useState({});
  const [loadingCat, setLoadingCat] = useState(true);
  const [loadingWR,  setLoadingWR]  = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);

  /* ── Contexto de partida ── */
  const [mode,  setMode]  = useState('Gem Grab');
  const [mapId, setMapId] = useState(null);

  /* ── Draft ── */
  // phase: 'bans' → 'picks' → 'done'
  const [phase,         setPhase]         = useState('bans');
  const [banningFor,    setBanningFor]    = useState(0);   // equipo al que se le asignan bans (0 = mi equipo, 1 = rival)
  const [pickTurn,      setPickTurn]      = useState(0);   // índice en PICK_STEPS
  const [teams,         setTeams]         = useState([initTeam(), initTeam()]);
  const [myTeam,        setMyTeam]        = useState(0);   // 0 = izquierda
  const [showEnemyView, setShowEnemyView] = useState(false);
  const [search,        setSearch]        = useState('');

  /* ── Composiciones guardadas ── */
  const [savedComps, setSavedComps] = useState([]);

  /* ── Carga: catálogo + mapas ── */
  useEffect(() => {
    setLoadingCat(true);
    Promise.all([
      fetchApi('/brawlers').catch(() => []),
      fetchApi('/brawlers/maps').catch(() => []),
    ]).then(([brs, mps]) => {
      setBrawlers(Array.isArray(brs) ? brs : []);
      setAllMaps(Array.isArray(mps) ? mps : []);
    }).finally(() => setLoadingCat(false));
  }, []);

  /* ── Win rates al cambiar modo ── */
  useEffect(() => {
    if (!mode) return;
    let alive = true;
    setLoadingWR(true); setWinrates([]); setMapId(null); setMapStats({});
    fetchApi('/brawlers/winrates?mode=' + encodeURIComponent(mode) + '&minSamples=5')
      .then(d => { if (alive) setWinrates(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) setWinrates([]); })
      .finally(() => { if (alive) setLoadingWR(false); });
    return () => { alive = false; };
  }, [mode]);

  /* ── Stats del mapa — con fallback a la lista si el detalle no tiene stats ── */
  useEffect(() => {
    if (mapId == null) { setMapStats({}); return; }
    let alive = true;
    setLoadingMap(true);

    const processStats = (rawStats) => {
      const map = {};
      for (const s of rawStats) {
        const isObj = s.brawler && typeof s.brawler === 'object';
        const bid   = isObj ? s.brawler.id : s.brawler;
        if (bid == null) continue;
        map[Number(bid)] = {
          winRate: Number(s.winRate ?? 0),
          useRate: Number(s.useRate ?? s.pickRate ?? 0),
        };
      }
      return map;
    };

    fetchApi('/brawlers/maps/' + encodeURIComponent(mapId))
      .then(async d => {
        if (!alive) return;
        let raw = Array.isArray(d?.stats) ? d.stats : [];

        // Fallback: BrawlAPI a veces solo incluye stats en el endpoint de lista
        if (raw.length === 0) {
          try {
            const allMapsData = await fetchApi('/brawlers/maps');
            const found = Array.isArray(allMapsData)
              ? allMapsData.find(m => String(m.id) === String(mapId))
              : null;
            if (found?.stats?.length) raw = found.stats;
          } catch {}
        }

        if (alive) setMapStats(processStats(raw));
      })
      .catch(() => { if (alive) setMapStats({}); })
      .finally(() => { if (alive) setLoadingMap(false); });

    return () => { alive = false; };
  }, [mapId]);

  /* ── Composiciones guardadas ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedComps(JSON.parse(raw));
    } catch {}
  }, []);

  const persistComps = (next) => {
    setSavedComps(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  /* ── Derivados ── */

  const brawlerById = (id) => brawlers.find(b => Number(b.id) === Number(id)) || null;

  const mapsForMode = useMemo(() =>
    allMaps.filter(m => m?.gameMode?.name === mode && !m.disabled)
           .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [allMaps, mode]
  );

  const selectedMapName = mapId != null ? (mapsForMode.find(m => m.id === mapId)?.name || null) : null;

  const activeWinrates = useMemo(() => {
    if (mapId != null && Object.keys(mapStats).length > 0) {
      return Object.entries(mapStats).map(([bid, s]) => {
        const b = brawlerById(Number(bid));
        return {
          id:      Number(bid),
          name:    b?.name || ('#' + bid),
          role:    b?.role || null,
          winRate: s.winRate != null && Number.isFinite(s.winRate) ? Math.round(s.winRate) : null,
          useRate: s.useRate || 0,
        };
      });
    }
    return winrates;
  }, [mapId, mapStats, winrates, brawlers]);

  const activeById = (id) => activeWinrates.find(w => Number(w.id) === Number(id)) || null;

  const totalGames = useMemo(() => winrates.reduce((s, w) => s + (w.games || 0), 0), [winrates]);

  /* ── Derivados del draft ── */

  const allBannedIds = useMemo(() =>
    new Set([...teams[0].bans, ...teams[1].bans].filter(Boolean).map(Number)),
    [teams]
  );
  const allPickedIds = useMemo(() =>
    new Set([...teams[0].picks, ...teams[1].picks].filter(Boolean).map(Number)),
    [teams]
  );
  const usedIds = useMemo(() => new Set([...allBannedIds, ...allPickedIds]), [allBannedIds, allPickedIds]);

  const bansComplete  = teams[0].bans.every(Boolean) && teams[1].bans.every(Boolean);
  const myBansCount   = teams[myTeam].bans.filter(Boolean).length;
  const rivBansCount  = teams[1 - myTeam].bans.filter(Boolean).length;

  const currentPickStep = phase === 'picks' && pickTurn < PICK_TOTAL ? PICK_STEPS[pickTurn] : null;
  const draftComplete   = phase === 'done' || (phase === 'picks' && pickTurn >= PICK_TOTAL);

  const myPicks        = teams[myTeam].picks;
  const myPickComplete = myPicks.every(Boolean);

  // Score de mi equipo
  const score = useMemo(() => {
    if (!myPickComplete) return null;
    const rates = myPicks.map(id => activeById(id)?.winRate).filter(r => r != null);
    if (!rates.length) return null;
    return Math.round(rates.reduce((s, r) => s + r, 0) / rates.length);
  }, [myPicks, activeWinrates, myPickComplete]);

  const selectedBrawlers = myPicks.map(id => brawlerById(id)).filter(Boolean);

  const roleCoverage = useMemo(() => {
    if (!myPickComplete) return null;
    const roles  = selectedBrawlers.map(b => b?.role).filter(Boolean);
    const unique = new Set(roles);
    if (!roles.length) return null;
    if (unique.size === 3) return { kind: 'good', text: 'Composición balanceada — 3 roles distintos' };
    if (unique.size === 1) return { kind: 'bad',  text: `Mono-rol — 3 brawlers de tipo "${roles[0]}"` };
    return { kind: 'ok', text: `${unique.size} roles distintos` };
  }, [selectedBrawlers, myPickComplete]);

  const synergyHints = useMemo(() => {
    if (!myPickComplete) return [];
    const names = selectedBrawlers.map(b => b?.name).filter(Boolean);
    const pair  = (a, b) => names.includes(a) && names.includes(b);
    const hints = [];
    if (names.filter(n => ['Leon','Crow','Sandy','Mortis','Edgar'].includes(n)).length >= 2)
      hints.push({ kind:'good', text:'Sinergia de asesinos / movilidad alta' });
    if (pair('Pam','Poco') || pair('Pam','Byron') || pair('Poco','Byron'))
      hints.push({ kind:'good', text:'Sinergia de healers' });
    if (pair('Frank','Tara'))
      hints.push({ kind:'good', text:'Combo de ult: Tara + Frank' });
    if (pair('Gene','Frank') || pair('Gene','Fang'))
      hints.push({ kind:'good', text:'Combo de control: gancho + finisher' });
    if (names.filter(n => ['Piper','Brock','Bea','Belle'].includes(n)).length >= 2)
      hints.push({ kind:'ok', text:'2+ snipers — riesgo en mapas con poca cobertura' });
    return hints;
  }, [selectedBrawlers, myPickComplete]);

  // Recomendaciones según fase
  const recommendations = useMemo(() => {
    const available = [...activeWinrates].filter(w => w.winRate != null && !usedIds.has(Number(w.id)));

    if (phase === 'bans') {
      // Sugerir banear los brawlers con mayor WR (más peligrosos para el rival)
      return available.sort((a, b) => b.winRate - a.winRate).slice(0, 8);
    }

    if (phase === 'picks') {
      if (!currentPickStep) return [];
      const isMyTurn = currentPickStep.team === myTeam;
      if (!isMyTurn && !showEnemyView) return [];
      return available.sort((a, b) => b.winRate - a.winRate).slice(0, 8);
    }

    return available.sort((a, b) => b.winRate - a.winRate).slice(0, 8);
  }, [phase, activeWinrates, usedIds, currentPickStep, myTeam, showEnemyView]);

  // Picker list
  const pickerList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return brawlers
      .filter(b => !q || (b.name || '').toLowerCase().includes(q))
      .map(b => ({
        ...b,
        winRate: activeById(b.id)?.winRate ?? null,
        banned:  allBannedIds.has(Number(b.id)),
        picked:  allPickedIds.has(Number(b.id)),
      }))
      .sort((a, b) => {
        const aU = a.banned || a.picked, bU = b.banned || b.picked;
        if (aU !== bU) return aU ? 1 : -1;
        const aw = a.winRate ?? -1, bw = b.winRate ?? -1;
        if (bw !== aw) return bw - aw;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [brawlers, activeWinrates, search, allBannedIds, allPickedIds]);

  /* ── Handlers ── */

  const handleBanSelect = (brawlerId) => {
    const id   = Number(brawlerId);
    const team = banningFor;
    if (usedIds.has(id)) return;
    setTeams(prev => prev.map((t, ti) => {
      if (ti !== team) return t;
      const slot = t.bans.findIndex(s => s === null);
      if (slot === -1) return t;
      const newBans = [...t.bans];
      newBans[slot] = id;
      return { ...t, bans: newBans };
    }));
    setSearch('');
  };

  const handlePickSelect = (brawlerId) => {
    if (phase !== 'picks' || pickTurn >= PICK_TOTAL) return;
    const id   = Number(brawlerId);
    if (usedIds.has(id)) return;
    const step = PICK_STEPS[pickTurn];
    setTeams(prev => prev.map((t, ti) => {
      if (ti !== step.team) return t;
      const slot = t.picks.findIndex(s => s === null);
      if (slot === -1) return t;
      const newPicks = [...t.picks];
      newPicks[slot] = id;
      return { ...t, picks: newPicks };
    }));
    const nextTurn = pickTurn + 1;
    setPickTurn(nextTurn);
    if (nextTurn >= PICK_TOTAL) setPhase('done');
    setSearch('');
  };

  const handleSelect = (brawlerId) => {
    if (phase === 'bans') handleBanSelect(brawlerId);
    else if (phase === 'picks') handlePickSelect(brawlerId);
  };

  const handleStartPicks = () => {
    setPhase('picks');
    setPickTurn(0);
  };

  const handleUndoBan = (teamIdx) => {
    setTeams(prev => prev.map((t, ti) => {
      if (ti !== teamIdx) return t;
      const idx = [...t.bans].reverse().findIndex(s => s !== null);
      if (idx === -1) return t;
      const realIdx = BAN_SLOTS - 1 - idx;
      const newBans = [...t.bans];
      newBans[realIdx] = null;
      return { ...t, bans: newBans };
    }));
  };

  const handleUndoPick = () => {
    if (phase !== 'picks' || pickTurn === 0) return;
    const prevTurn = pickTurn - 1;
    const step     = PICK_STEPS[prevTurn];
    setTeams(prev => prev.map((t, ti) => {
      if (ti !== step.team) return t;
      const idx = [...t.picks].reverse().findIndex(s => s !== null);
      if (idx === -1) return t;
      const realIdx = 2 - idx;
      const newPicks = [...t.picks];
      newPicks[realIdx] = null;
      return { ...t, picks: newPicks };
    }));
    setPickTurn(prevTurn);
    if (phase === 'done') setPhase('picks');
  };

  const handleReset = () => {
    setPhase('bans');
    setPickTurn(0);
    setTeams([initTeam(), initTeam()]);
    setBanningFor(0);
    setShowEnemyView(false);
    setSearch('');
  };

  const handleSave = () => {
    if (!myPickComplete || score == null) return;
    const def  = myPicks.map(id => brawlerById(id)?.name || '?').join(' + ') + ' · ' + mode + (selectedMapName ? ' · ' + selectedMapName : '');
    const name = window.prompt('Nombre para esta composición:', def);
    if (!name) return;
    const next = [{
      id: Date.now(), name, mode, mapId, mapName: selectedMapName,
      brawlerIds: [...myPicks], score, savedAt: new Date().toISOString(),
    }, ...savedComps].slice(0, 30);
    persistComps(next);
  };

  const handleLoad = (comp) => {
    handleReset();
    setMode(comp.mode);
    setTimeout(() => {
      setTeams(prev => {
        const next = [...prev];
        next[myTeam] = { ...next[myTeam], picks: [...comp.brawlerIds] };
        return next;
      });
      setPhase('done');
      if (comp.mapId != null) setMapId(comp.mapId);
    }, 60);
  };

  const handleDelete = (id) => persistComps(savedComps.filter(c => c.id !== id));

  /* ── Labels de turno ── */
  const enemyTeam  = 1 - myTeam;
  const myLabel    = 'Mi Equipo';
  const rivLabel   = 'Rival';

  const pickTurnLabel = () => {
    if (!currentPickStep) return null;
    return {
      who:    currentPickStep.team === myTeam ? 'Tu turno' : 'Turno del rival',
      action: currentPickStep.team === myTeam ? 'Elige tu brawler' : 'El rival elige',
      isMyTurn: currentPickStep.team === myTeam,
    };
  };
  const pickTurnInfo = pickTurnLabel();

  /* ── Render ── */

  const hasMapStats = Object.keys(mapStats).length > 0;

  return (
    <Layout>
      <Topbar title="Calculadora Competitiva" />
      <div className="page">

        {/* ── Selector de modo ── */}
        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title">Modo de juego</span>
            {totalGames > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {totalGames.toLocaleString()} partidas analizadas
              </span>
            )}
          </div>
          <div className="cc-mode-pills">
            {MODES.map(m => (
              <button key={m.name}
                className={'cc-mode-pill' + (mode === m.name ? ' is-active' : '')}
                onClick={() => { setMode(m.name); handleReset(); }}>
                <span style={{ fontSize: 15 }}>{m.emoji}</span> {m.name}
              </button>
            ))}
          </div>

          {/* ── Selector de mapa ── */}
          {mapsForMode.length > 0 && (
            <>
              <div style={{ marginTop: 'var(--s4)', marginBottom: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="card-title">
                  Mapa
                  {selectedMapName && (
                    <span style={{ color: 'var(--blue)', fontWeight: 700, marginLeft: 8 }}>
                      · {selectedMapName}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {mapId == null
                    ? 'Usando datos agregados del modo'
                    : hasMapStats
                      ? 'Stats específicas del mapa activas ✓'
                      : loadingMap
                        ? 'Cargando stats del mapa…'
                        : 'Sin stats para este mapa — usando agregado'}
                </span>
              </div>
              <div className="cc-map-row">
                <button type="button"
                  className={'cc-map' + (mapId == null ? ' is-active' : '')}
                  onClick={() => setMapId(null)}>
                  <div className="cc-map-img is-all">∗</div>
                  <div className="cc-map-name">Todos</div>
                </button>
                {mapsForMode.map(m => (
                  <button key={m.id} type="button"
                    className={'cc-map' + (mapId === m.id ? ' is-active' : '')}
                    onClick={() => setMapId(m.id)}
                    title={m.name + (m.environment?.name ? ' · ' + m.environment.name : '')}>
                    <div className="cc-map-img">
                      <img src={'https://cdn.brawlify.com/maps/regular/' + m.id + '.png'} alt={m.name}
                        loading="lazy"
                        onError={e => {
                          if (m.imageUrl && e.currentTarget.src !== m.imageUrl) e.currentTarget.src = m.imageUrl;
                          else e.currentTarget.style.visibility = 'hidden';
                        }} />
                    </div>
                    <div className="cc-map-name">{m.name}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Draft Board ── */}
        <div className="cc-draft-board">

          {/* Equipo izquierdo */}
          <DraftTeam
            label={myTeam === 0 ? myLabel : rivLabel}
            isMine={myTeam === 0}
            team={teams[0]}
            teamIdx={0}
            phase={phase}
            currentPickStep={currentPickStep}
            activeWinrates={activeWinrates}
            brawlerById={brawlerById}
            highlightBans={phase === 'bans' && banningFor === 0}
            onClearBan={() => handleUndoBan(0)}
            onClearPick={(slot) => {
              if (myTeam !== 0) return;
              setTeams(prev => prev.map((t, ti) =>
                ti !== 0 ? t : { ...t, picks: t.picks.map((v, i) => i === slot ? null : v) }
              ));
              if (phase === 'done') setPhase('picks');
            }}
          />

          {/* Centro */}
          <div className="cc-draft-center">
            <div className="cc-draft-vs">VS</div>

            {/* Indicador de fase/turno */}
            <div className="cc-draft-turn-card">
              {phase === 'bans' && (
                <>
                  <span className="cc-draft-phase-badge bans">🚫 BANS</span>
                  <div className="cc-draft-turn-num">Simultáneos</div>
                  <div className="cc-draft-turn-label">
                    Baneando para:{' '}
                    <span style={{ color: banningFor === myTeam ? 'var(--blue)' : 'var(--error)', fontWeight: 700 }}>
                      {banningFor === myTeam ? myLabel : rivLabel}
                    </span>
                  </div>
                  <div className="cc-draft-turn-sub">
                    {myLabel}: {myBansCount}/3 · {rivLabel}: {rivBansCount}/3
                  </div>
                </>
              )}
              {phase === 'picks' && pickTurnInfo && (
                <>
                  <span className="cc-draft-phase-badge picks">✅ PICKS</span>
                  <div className="cc-draft-turn-num">Pick {pickTurn + 1} / {PICK_TOTAL}</div>
                  <div className="cc-draft-turn-label">{pickTurnInfo.who}</div>
                  <div className="cc-draft-turn-sub">{pickTurnInfo.action}</div>
                </>
              )}
              {(phase === 'done' || (phase === 'picks' && pickTurn >= PICK_TOTAL)) && (
                <>
                  <span className="cc-draft-phase-badge done">✓ COMPLETO</span>
                  <div className="cc-draft-turn-sub">Draft finalizado</div>
                </>
              )}
            </div>

            {/* Toggle vista rival (solo en picks) */}
            {phase === 'picks' && (
              <button
                className={'cc-draft-toggle' + (showEnemyView ? ' active' : '')}
                onClick={() => setShowEnemyView(v => !v)}>
                <span className="cc-draft-toggle-dot" />
                {showEnemyView ? 'Vista rival ON' : 'Vista rival'}
              </button>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              {/* Ban phase: toggle equipo + pasar a picks */}
              {phase === 'bans' && (
                <>
                  <button className="btn btn-sm btn-secondary"
                    onClick={() => setBanningFor(v => 1 - v)}>
                    ⇄ Banear para {banningFor === myTeam ? rivLabel : myLabel}
                  </button>
                  <button className="btn btn-sm btn-primary"
                    onClick={handleStartPicks}>
                    {bansComplete ? 'Iniciar Picks →' : 'Saltar bans →'}
                  </button>
                </>
              )}

              {/* Pick phase: deshacer */}
              {phase === 'picks' && (
                <>
                  <button className="btn btn-sm btn-secondary"
                    onClick={handleUndoPick}
                    disabled={pickTurn === 0}>
                    ↩ Deshacer pick
                  </button>
                  <button className="btn btn-sm btn-secondary"
                    onClick={() => setPhase('bans')}>
                    ← Volver a bans
                  </button>
                </>
              )}

              {/* Cambiar lado + reset */}
              <button className="btn btn-sm"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                onClick={() => setMyTeam(t => 1 - t)}
                title="Cambiar qué equipo es el mío">
                ⇄ Cambiar lado
              </button>
              <button className="btn btn-sm btn-danger" onClick={handleReset}>
                ✕ Reset
              </button>
            </div>
          </div>

          {/* Equipo derecho */}
          <DraftTeam
            label={myTeam === 1 ? myLabel : rivLabel}
            isMine={myTeam === 1}
            team={teams[1]}
            teamIdx={1}
            phase={phase}
            currentPickStep={currentPickStep}
            activeWinrates={activeWinrates}
            brawlerById={brawlerById}
            highlightBans={phase === 'bans' && banningFor === 1}
            onClearBan={() => handleUndoBan(1)}
            onClearPick={(slot) => {
              if (myTeam !== 1) return;
              setTeams(prev => prev.map((t, ti) =>
                ti !== 1 ? t : { ...t, picks: t.picks.map((v, i) => i === slot ? null : v) }
              ));
              if (phase === 'done') setPhase('picks');
            }}
          />
        </div>

        {/* ── Recomendaciones ── */}
        {recommendations.length > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">
                {phase === 'bans'
                  ? `Sugerencias de ban — ${banningFor === myTeam ? myLabel : rivLabel}`
                  : draftComplete
                    ? `Top brawlers — ${mode}${selectedMapName ? ' · ' + selectedMapName : ''}`
                    : pickTurnInfo?.isMyTurn
                      ? 'Recomendaciones para ti'
                      : 'Recomendaciones para el rival'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {phase === 'bans'
                  ? 'Los de mayor WR son los más peligrosos'
                  : 'Click para añadir al picker'}
              </span>
            </div>

            {phase === 'picks' && !draftComplete && !pickTurnInfo?.isMyTurn && !showEnemyView ? (
              <div style={{ textAlign: 'center', padding: 'var(--s5)', color: 'var(--text-3)', fontSize: 13 }}>
                Turno del rival — activa <strong>Vista rival</strong> para ver sus recomendaciones.
              </div>
            ) : (
              <div className="cc-draft-rec-grid">
                {recommendations.map(b => (
                  <button key={b.id} type="button"
                    className={'cc-draft-rec' + (phase === 'bans' ? ' is-ban' : '')}
                    onClick={() => handleSelect(b.id)}
                    disabled={draftComplete}
                    title={`${b.name} — ${b.winRate}% WR`}>
                    <img src={brawlerImg(b.id)} alt={b.name}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                    <div className="cc-draft-rec-name">{b.name}</div>
                    <div className="cc-draft-rec-wr" style={{ color: wrColor(b.winRate) }}>
                      {b.winRate}%
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="cc-grid">

          {/* ── Picker ── */}
          <div>
            <div className="card mb-4">
              <div className="card-header">
                <span className="card-title">
                  {phase === 'bans'
                    ? `Elegir bans — ${banningFor === myTeam ? myLabel : rivLabel}`
                    : draftComplete
                      ? 'Catálogo'
                      : pickTurnInfo?.isMyTurn
                        ? 'Elige tu brawler'
                        : showEnemyView
                          ? 'Brawler del rival'
                          : 'Esperando turno del rival…'}
                </span>
                <input className="form-input" placeholder="Buscar…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ maxWidth: 180, padding: '6px 10px' }} />
              </div>

              {loadingCat ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
                  <div className="loading-spinner" />
                </div>
              ) : (
                <div className="cc-picker-grid">
                  {pickerList.map(b => (
                    <button key={b.id} type="button"
                      className={'cc-picker' + (b.banned || b.picked ? ' is-taken' : '')}
                      disabled={b.banned || b.picked || draftComplete ||
                        (phase === 'picks' && !pickTurnInfo?.isMyTurn && !showEnemyView)}
                      onClick={() => handleSelect(b.id)}
                      title={`${b.name}${b.winRate != null ? ' · ' + b.winRate + '% WR' : ''}${b.banned ? ' (VETADO)' : ''}`}>
                      <img src={brawlerImg(b.id)} alt={b.name}
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                      <div className="cc-picker-name">{b.name}</div>
                      <div className="cc-picker-wr"
                        style={{ color: b.banned ? 'var(--error)' : wrColor(b.winRate) }}>
                        {b.banned ? '🚫' : b.winRate != null ? b.winRate + '%' : '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Panel de score ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{myLabel}</span>
            </div>

            <div className="cc-source-badge">
              Datos:{' '}
              {mapId != null && hasMapStats
                ? <><b>{selectedMapName || '#' + mapId}</b> (mapa)</>
                : mapId != null && !hasMapStats
                  ? <><b>{mode}</b> (sin datos del mapa)</>
                  : <><b>{mode}</b> (todos los mapas)</>}
              {loadingMap && <span style={{ color: 'var(--text-3)' }}> · cargando…</span>}
            </div>

            {!myPickComplete ? (
              <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⊞</div>
                <div style={{ fontSize: 13 }}>
                  {phase === 'bans'
                    ? 'Termina los bans y empieza los picks'
                    : 'Completa los 3 picks de tu equipo'}
                </div>
              </div>
            ) : (
              <>
                <div className="cc-score-big">
                  <div className="cc-score-val" style={{ color: scoreColor(score) }}>
                    {score != null ? score : '—'}
                  </div>
                  <div className="cc-score-lbl" style={{ color: scoreColor(score) }}>
                    {scoreLabel(score)}
                  </div>
                  {score == null && (
                    <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 8 }}>
                      Sin datos suficientes para este modo/mapa.
                    </p>
                  )}
                </div>

                <div className="cc-breakdown">
                  {myPicks.filter(Boolean).map((id, i) => {
                    const b  = brawlerById(id);
                    const wr = activeById(id);
                    if (!b) return null;
                    return (
                      <div key={i} className="cc-breakdown-row">
                        <img src={brawlerImg(b.id)} alt={b.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }} />
                        <div className="cc-breakdown-meta">
                          <div className="cc-breakdown-name">{b.name}</div>
                          <div className="cc-breakdown-role">{b.role || 'Sin rol'}</div>
                        </div>
                        <div className="cc-breakdown-wr" style={{ color: wrColor(wr?.winRate) }}>
                          {wr?.winRate != null
                            ? wr.winRate + '%'
                            : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>n/d</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {roleCoverage && (
                  <div className={'cc-synergy ' + roleCoverage.kind}>
                    {roleCoverage.kind === 'good' ? '✓' : roleCoverage.kind === 'bad' ? '✕' : 'ⓘ'}
                    {' '}{roleCoverage.text}
                  </div>
                )}
                {synergyHints.map((h, i) => (
                  <div key={i} className={'cc-synergy ' + h.kind}>
                    {h.kind === 'good' ? '✓' : h.kind === 'bad' ? '✕' : 'ⓘ'} {h.text}
                  </div>
                ))}

                <button className="btn btn-primary w-full mt-4"
                  onClick={handleSave} disabled={score == null}>
                  Guardar composición
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Composiciones guardadas ── */}
        {savedComps.length > 0 && (
          <div className="card mt-6">
            <div className="card-header">
              <span className="card-title">Composiciones guardadas ({savedComps.length})</span>
            </div>
            <div className="cc-saved-grid">
              {savedComps.map(c => (
                <div key={c.id} className="cc-saved">
                  <div className="cc-saved-head">
                    <span className="cc-saved-name">{c.name}</span>
                    <button className="cc-saved-del" onClick={() => handleDelete(c.id)}>×</button>
                  </div>
                  <div className="cc-saved-mode">
                    {c.mode}
                    {c.mapName && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> · {c.mapName}</span>}
                  </div>
                  <div className="cc-saved-brawlers">
                    {c.brawlerIds.filter(Boolean).map(bid => (
                      <img key={bid} src={brawlerImg(bid)} alt={brawlerById(bid)?.name || ''}
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                    ))}
                  </div>
                  <div className="cc-saved-score">
                    Score: <b style={{ color: scoreColor(c.score) }}>{c.score}</b>
                  </div>
                  <button className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                    onClick={() => handleLoad(c)}>
                    Cargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

/* ── Sub-componente: Panel de equipo ────────────────────────────────────── */

function DraftTeam({ label, isMine, team, teamIdx, phase, currentPickStep,
                     activeWinrates, brawlerById, highlightBans, onClearBan, onClearPick }) {
  const activeById = (id) => activeWinrates.find(w => Number(w.id) === Number(id)) || null;
  const wrColor    = (wr) => wr == null ? 'var(--text-3)' : wr >= 55 ? '#22c55e' : wr >= 45 ? '#facc15' : '#ef4444';
  const isPickTurn = currentPickStep?.team === teamIdx;

  return (
    <div className={`cc-draft-team${isMine ? ' is-mine' : ' is-enemy'}${
      (phase === 'bans' && highlightBans) || (phase === 'picks' && isPickTurn) ? ' is-active' : ''}`}>

      {/* Header */}
      <div className="cc-draft-team-header">
        <span className={`cc-draft-team-label ${isMine ? 'mine' : 'enemy'}`}>{label}</span>
        {phase === 'picks' && isPickTurn && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px',
            borderRadius: 999, background: 'rgba(34,197,94,0.15)', color: 'var(--success)',
            border: '1px solid rgba(34,197,94,0.4)',
          }}>
            ✅ ELIGE
          </span>
        )}
        {phase === 'bans' && highlightBans && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px',
            borderRadius: 999, background: 'rgba(239,68,68,0.15)', color: 'var(--error)',
            border: '1px solid rgba(239,68,68,0.4)',
          }}>
            🚫 BANEANDO
          </span>
        )}
      </div>

      {/* Bans */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>
            VETADOS ({team.bans.filter(Boolean).length}/3)
          </span>
          {phase === 'bans' && team.bans.some(Boolean) && (
            <button onClick={onClearBan}
              style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ↩
            </button>
          )}
        </div>
        <div className="cc-draft-bans">
          {team.bans.map((id, i) => {
            const b = id ? brawlerById(id) : null;
            return (
              <div key={i} className={`cc-draft-ban-slot${id ? ' filled' : ''}`}
                title={b?.name || (id ? 'Vetado' : 'Veto libre')}>
                {b && <>
                  <img src={`https://cdn.brawlify.com/brawlers/borders/${b.id}.png`} alt={b.name}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                  <span className="ban-x">✕</span>
                </>}
                {!id && <span style={{ fontSize: 16, color: 'var(--text-3)', opacity: 0.35 }}>✕</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Picks */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
          PICKS ({team.picks.filter(Boolean).length}/3)
        </div>
        <div className="cc-draft-picks">
          {team.picks.map((id, i) => {
            const b  = id ? brawlerById(id) : null;
            const wr = id ? activeById(id) : null;
            return (
              <div key={i} className={`cc-draft-pick-slot${!b ? ' empty' : isMine ? ' mine-pick' : ' enemy-pick'}`}>
                {b ? (
                  <>
                    <img src={`https://cdn.brawlify.com/brawlers/borders/${b.id}.png`} alt={b.name}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                    <div className="cc-draft-pick-name">{b.name}</div>
                    <div className="cc-draft-pick-wr" style={{ color: wrColor(wr?.winRate) }}>
                      {wr?.winRate != null ? wr.winRate + '%' : '—'}
                    </div>
                    {isMine && (
                      <button className="cc-draft-pick-clear"
                        onClick={() => onClearPick(i)} title="Quitar">×</button>
                    )}
                  </>
                ) : (
                  <span>Slot {i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
