const { Stat, Player, Brawler } = require('../models');
const supercell = require('../services/supercell.service');
const { ok, notFound }  = require('../utils/apiResponse');

// GET /api/v1/stats/me  — estadísticas históricas del jugador autenticado
async function getMyStats(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');

    const stats = await Stat.findAll({
      where: { playerId: player.id },
      include: [{ model: Brawler, as: 'brawler', attributes: ['id','name','rarity'] }],
      order: [['recordedAt','DESC']],
      limit: 200,
    });

    return ok(res, stats);
  } catch (err) { next(err); }
}

// POST /api/v1/stats/snapshot  — guarda un snapshot del estado actual del jugador
async function saveSnapshot(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');

    // Obtiene datos frescos de la API
    const apiData = await supercell.getPlayer(player.tag);

    // Crea una entrada de stat por cada brawler del jugador
    const snapshots = [];
    for (const b of apiData.brawlers || []) {
      const snap = await Stat.create({
        playerId:        player.id,
        brawlerId:       b.id,
        trophies:        b.trophies,
        highestTrophies: b.highestTrophies,
        rank:            b.rank,
        recordedAt:      new Date(),
      });
      snapshots.push(snap);
    }

    return ok(res, { saved: snapshots.length });
  } catch (err) { next(err); }
}

// GET /api/v1/stats/winrate  — win rate por modo de juego del jugador
async function getWinRate(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');

    // Obtiene el battle log y calcula win rate por modo
    const battles = await supercell.getBattleLog(player.tag);
    const modes   = {};

    for (const battle of battles) {
      const mode   = battle.event?.mode || 'unknown';
      const result = battle.battle?.result;
      if (!modes[mode]) modes[mode] = { wins: 0, total: 0 };
      modes[mode].total++;
      if (result === 'victory') modes[mode].wins++;
    }

    const winRates = Object.entries(modes).map(([mode, d]) => ({
      mode,
      wins:    d.wins,
      total:   d.total,
      winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
    }));

    return ok(res, winRates);
  } catch (err) { next(err); }
}

module.exports = { getMyStats, saveSnapshot, getWinRate };
