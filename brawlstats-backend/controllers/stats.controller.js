const { Op } = require('sequelize');
const { Stat, Player, Brawler, Battle, PlayerSnapshot } = require('../models');
const supercell = require('../services/supercell.service');
const { ok, notFound } = require('../utils/apiResponse');

const MODE_LABELS = {
  gemGrab:'Gem Grab', brawlBall:'Brawl Ball', showdown:'Showdown',
  soloShowdown:'Solo Showdown', duoShowdown:'Duo Showdown', hotZone:'Hot Zone',
  knockout:'Knockout', bounty:'Bounty', heist:'Heist', duels:'Duels',
  wipeout:'Wipeout', siege:'Siege', basketBrawl:'Basket Brawl',
  holdTheTrophy:'Hold The Trophy', botDrop:'Bot Drop',
};

function handleSupercellError(err, res) {
  if (err.response?.status === 403)
    return res.status(502).json({ success: false, error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
  if (err.response?.status === 404)
    return res.status(404).json({ success: false, error: 'Jugador no encontrado en Brawl Stars' });
  return null;
}

async function ensurePlayer(req, res) {
  const player = await Player.findOne({ where: { userId: req.user.id } });
  if (!player) { notFound(res, 'No tienes ningún jugador vinculado'); return null; }
  return player;
}

async function getMyStats(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const stats = await Stat.findAll({
      where: { playerId: player.id },
      include: [{ model: Brawler, as: 'brawler', attributes: ['id','name','rarity'] }],
      order: [['recordedAt','DESC']], limit: 200,
    });
    return ok(res, stats);
  } catch (err) { next(err); }
}

async function saveSnapshot(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    let apiData;
    try {
      apiData = await supercell.getPlayer(player.tag);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }
    const snapshots = [];
    for (const b of apiData.brawlers || []) {
      const snap = await Stat.create({
        playerId: player.id, brawlerId: b.id,
        trophies: b.trophies, highestTrophies: b.highestTrophies, rank: b.rank,
        recordedAt: new Date(),
      });
      snapshots.push(snap);
    }
    await PlayerSnapshot.create({
      playerId:        player.id,
      trophies:        apiData.trophies,
      highestTrophies: apiData.highestTrophies,
      level:           apiData.expLevel,
      recordedAt:      new Date(),
    });
    return ok(res, { saved: snapshots.length });
  } catch (err) { next(err); }
}

// Win rate calculado desde la BD acumulada de batallas (últimas N).
// Si no hay nada en BD aún, cae al battlelog de Supercell (25 partidas).
async function getWinRate(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const limit = Math.min(500, parseInt(req.query.limit, 10) || 100);

    let battles = await Battle.findAll({
      where: { playerId: player.id },
      order: [['battleAt', 'DESC']],
      limit,
    });

    // Fallback: aún no hay nada acumulado, usa Supercell directo
    if (battles.length === 0) {
      try {
        const raw = await supercell.getBattleLog(player.tag);
        battles = raw.map(b => ({
          mode:   b.event?.mode || b.battle?.mode || 'unknown',
          result: (() => {
            const r = b.battle?.result;
            if (r === 'victory') return 'Win';
            if (r === 'defeat')  return 'Loss';
            if (r === 'draw')    return 'Draw';
            const rk = b.battle?.rank;
            if (rk == null) return 'Draw';
            const cutoff = (b.event?.mode || b.battle?.mode) === 'duoShowdown' ? 2 : 4;
            return rk <= cutoff ? 'Win' : 'Loss';
          })(),
        }));
      } catch (err) {
        const handled = handleSupercellError(err, res);
        if (handled) return handled;
        return next(err);
      }
    }

    const modes = {};
    for (const b of battles) {
      const m = b.mode;
      if (!modes[m]) modes[m] = { wins: 0, total: 0 };
      modes[m].total++;
      if (b.result === 'Win') modes[m].wins++;
    }
    const winRates = Object.entries(modes).map(([mode, d]) => ({
      mode:    MODE_LABELS[mode] || mode,
      wins:    d.wins,
      total:   d.total,
      winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
    }));
    return ok(res, winRates);
  } catch (err) { next(err); }
}

async function getBattleLog(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    let battles;
    try {
      battles = await supercell.getBattleLog(player.tag);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }
    const formatted = battles.slice(0, 25).map(b => {
      let myBrawler = null;
      for (const team of b.battle?.teams || []) {
        const me = team.find(p => p.tag === player.tag);
        if (me) { myBrawler = me.brawler?.name || null; break; }
      }
      if (!myBrawler) {
        const me = (b.battle?.players || []).find(p => p.tag === player.tag);
        myBrawler = me?.brawler?.name || null;
      }
      const apiResult = b.battle?.result;
      const rank = b.battle?.rank ?? null;
      const mode = b.event?.mode || b.battle?.mode || '';
      let result;
      if (apiResult === 'victory') result = 'Win';
      else if (apiResult === 'defeat') result = 'Loss';
      else if (apiResult === 'draw') result = 'Draw';
      else if (rank != null) {
        const cutoff = mode === 'duoShowdown' ? 2 : 4;
        result = rank <= cutoff ? 'Win' : 'Loss';
      } else result = 'Draw';
      const trophyChange = b.battle?.trophyChange ?? 0;
      return {
        mode:         MODE_LABELS[mode] || mode || '?',
        map:          b.event?.map || '—',
        brawler:      myBrawler || '—',
        result,
        rank,
        trophyChange: trophyChange > 0 ? `+${trophyChange}` : String(trophyChange),
        battleTime:   b.battleTime || null,
      };
    });
    return ok(res, formatted);
  } catch (err) { next(err); }
}

// Histórico de trofeos para gráfico de evolución
async function getTrophyHistory(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const days = Math.min(365, parseInt(req.query.days, 10) || 30);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const snapshots = await PlayerSnapshot.findAll({
      where: { playerId: player.id, recordedAt: { [Op.gte]: since } },
      order: [['recordedAt', 'ASC']],
      attributes: ['recordedAt', 'trophies'],
    });
    const points = snapshots.map(s => ({ t: s.recordedAt, v: s.trophies }));
    return ok(res, points);
  } catch (err) { next(err); }
}

// Racha actual: secuencia de las últimas N partidas (W/L/D)
async function getStreak(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const battles = await Battle.findAll({
      where: { playerId: player.id },
      order: [['battleAt', 'DESC']],
      limit: 10,
      attributes: ['result', 'battleAt'],
    });
    // Racha consecutiva del mismo signo
    let streakLen = 0;
    let streakKind = null;
    for (const b of battles) {
      if (b.result === 'Draw') break;
      if (streakKind === null) { streakKind = b.result; streakLen = 1; continue; }
      if (b.result === streakKind) streakLen++;
      else break;
    }
    return ok(res, {
      streakKind,
      streakLen,
      recent: battles.map(b => b.result),
    });
  } catch (err) { next(err); }
}

// Distribución de partidas por modo (últimas 100)
async function getModeDistribution(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const battles = await Battle.findAll({
      where: { playerId: player.id },
      order: [['battleAt', 'DESC']],
      limit: 100,
      attributes: ['mode'],
    });
    const counts = {};
    for (const b of battles) counts[b.mode] = (counts[b.mode] || 0) + 1;
    const total = battles.length;
    const dist = Object.entries(counts)
      .map(([mode, n]) => ({
        mode:    MODE_LABELS[mode] || mode,
        count:   n,
        percent: total > 0 ? Math.round((n / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return ok(res, { total, modes: dist });
  } catch (err) { next(err); }
}

// Brawler más jugado en las últimas 100 partidas (agregado por nombre).
// Enriquecido con brawlerId mediante lookup contra la tabla brawlers.
async function getFavoriteBrawler(req, res, next) {
  try {
    const player = await ensurePlayer(req, res);
    if (!player) return;
    const battles = await Battle.findAll({
      where: { playerId: player.id, brawler: { [Op.ne]: null } },
      order: [['battleAt', 'DESC']],
      limit: 100,
      attributes: ['brawler', 'result', 'trophyChange'],
    });
    const agg = {};
    for (const b of battles) {
      if (!agg[b.brawler]) agg[b.brawler] = { games: 0, wins: 0, losses: 0, trophyChange: 0 };
      agg[b.brawler].games++;
      if (b.result === 'Win')  agg[b.brawler].wins++;
      if (b.result === 'Loss') agg[b.brawler].losses++;
      agg[b.brawler].trophyChange += (b.trophyChange || 0);
    }

    // Lookup brawlerId por nombre (las batallas guardan solo nombre)
    const names = Object.keys(agg);
    const brawlerRows = names.length
      ? await Brawler.findAll({ where: { name: { [Op.in]: names } }, attributes: ['id','name'] })
      : [];
    const nameToId = Object.fromEntries(brawlerRows.map(b => [b.name, b.id]));

    const ranked = Object.entries(agg)
      .map(([name, d]) => ({
        brawlerId:    nameToId[name] ?? null,
        brawlerName:  name,
        name,                                                              // alias compat
        totalGames:   d.games,
        games:        d.games,                                             // alias compat
        wins:         d.wins,
        losses:       d.losses,
        winRate:      d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0,
        trophyChange: d.trophyChange,
      }))
      .sort((a, b) => b.totalGames - a.totalGames);
    return ok(res, { top: ranked.slice(0, 3), favorite: ranked[0] || null });
  } catch (err) { next(err); }
}

module.exports = {
  getMyStats,
  saveSnapshot,
  getWinRate,
  getBattleLog,
  getTrophyHistory,
  getStreak,
  getModeDistribution,
  getFavoriteBrawler,
};
