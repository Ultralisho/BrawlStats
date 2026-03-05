const bcrypt    = require('bcryptjs');
const { Player, Stat, Battle, PlayerSnapshot, User } = require('../models');
const supercell = require('../services/supercell.service');
const { ok, created, notFound, badRequest } = require('../utils/apiResponse');

const SYSTEM_USER_EMAIL = 'system@brawlstats.local';

// Normaliza una batalla de Supercell para nuestro modelo Battle.
// Devuelve null si no se puede determinar el resultado.
function normalizeBattle(rawBattle, playerTag) {
  const mode = rawBattle.event?.mode || rawBattle.battle?.mode;
  if (!mode || !rawBattle.battleTime) return null;

  let myBrawler = null;
  for (const team of rawBattle.battle?.teams || []) {
    const me = team.find(p => p.tag === playerTag);
    if (me) { myBrawler = me.brawler?.name || null; break; }
  }
  if (!myBrawler) {
    const me = (rawBattle.battle?.players || []).find(p => p.tag === playerTag);
    myBrawler = me?.brawler?.name || null;
  }

  const apiResult = rawBattle.battle?.result;
  const rank      = rawBattle.battle?.rank ?? null;
  let result;
  if (apiResult === 'victory') result = 'Win';
  else if (apiResult === 'defeat') result = 'Loss';
  else if (apiResult === 'draw') result = 'Draw';
  else if (rank != null) {
    const cutoff = mode === 'duoShowdown' ? 2 : 4;
    result = rank <= cutoff ? 'Win' : 'Loss';
  } else return null;

  // battleTime de Supercell: "20260516T203000.000Z" → Date
  const t = rawBattle.battleTime;
  const iso = `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,11)}:${t.slice(11,13)}:${t.slice(13,15)}${t.slice(15)}`;
  const battleAt = new Date(iso);
  if (isNaN(battleAt.getTime())) return null;

  return {
    battleTime:   t,
    mode,
    map:          rawBattle.event?.map || null,
    brawler:      myBrawler,
    result,
    rank,
    trophyChange: rawBattle.battle?.trophyChange ?? 0,
    battleAt,
  };
}

function handleSupercellError(err, res) {
  if (err.response?.status === 403)
    return res.status(502).json({ success: false, error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
  if (err.response?.status === 404)
    return res.status(404).json({ success: false, error: 'Jugador no encontrado en Brawl Stars' });
  return null;
}

async function searchByTag(req, res, next) {
  try {
    const { tag } = req.query;
    if (!tag) return badRequest(res, 'Falta el parámetro tag');
    let data;
    try {
      data = await supercell.getPlayer(tag);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }
    return ok(res, data);
  } catch (err) { next(err); }
}

// GET /api/v1/players/by-tag/:tag  -> perfil publico + battlelog normalizado
async function getByTagPublic(req, res, next) {
  try {
    const tag = req.params.tag;
    if (!tag) return badRequest(res, 'Tag requerido');

    let player, raw;
    try {
      player = await supercell.getPlayer(tag);
      raw    = await supercell.getBattleLog(tag).catch(() => []);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }

    const playerTag = player.tag;
    const battles = raw.map(b => normalizeBattle(b, playerTag)).filter(Boolean);

    return ok(res, { player, battles });
  } catch (err) { next(err); }
}

async function linkPlayer(req, res, next) {
  try {
    const { tag } = req.body;
    if (!tag) return badRequest(res, 'Falta el parámetro tag');
    let apiData;
    try {
      apiData = await supercell.getPlayer(tag);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }

    // Si ya existe con otro userId, re-vincular al usuario actual
    const existing = await Player.findOne({ where: { tag: apiData.tag } });
    if (existing) {
      await existing.update({
        userId:          req.user.id,
        name:            apiData.name,
        trophies:        apiData.trophies,
        highestTrophies: apiData.highestTrophies,
        level:           apiData.expLevel,
        club:            apiData.club?.name || null,
        rawData:         apiData,
        lastSync:        new Date(),
      });
      return ok(res, existing);
    }

    const player = await Player.create({
      userId:          req.user.id,
      tag:             apiData.tag,
      name:            apiData.name,
      trophies:        apiData.trophies,
      highestTrophies: apiData.highestTrophies,
      level:           apiData.expLevel,
      club:            apiData.club?.name || null,
      rawData:         apiData,
      lastSync:        new Date(),
    });
    return created(res, player);
  } catch (err) { next(err); }
}

async function getMyPlayer(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');

    // Sincroniza si: datos viejos (>10 min), faltan brawlers, o victorias todas a 0
    const raw          = player.rawData || {};
    const ageMs        = player.lastSync ? Date.now() - new Date(player.lastSync).getTime() : Infinity;
    const isStale      = ageMs > 10 * 60 * 1000;
    const noBrawlers   = !raw.brawlers?.length;
    const noVictories  = !raw['3vs3Victories'] && !raw.soloVictories && !raw.duoVictories
                         && ageMs > 30 * 1000; // evita re-sync inmediato

    if (isStale || noBrawlers || noVictories) {
      try {
        const apiData = await supercell.getPlayer(player.tag);
        await player.update({
          name:            apiData.name,
          trophies:        apiData.trophies,
          highestTrophies: apiData.highestTrophies,
          level:           apiData.expLevel,
          club:            apiData.club?.name || null,
          rawData:         apiData,
          lastSync:        new Date(),
        });
      } catch (syncErr) {
        console.warn('[getMyPlayer] sync failed:', syncErr.message);
      }
    }

    return ok(res, player);
  } catch (err) { next(err); }
}

// DELETE /api/v1/players/me — desvincula el jugador del usuario actual.
// No borra los Battles ni los Stats acumulados: solo libera la asociacion
// userId -> player. El registro Player queda en BBDD como "huerfano" hasta
// que otro usuario lo re-vincule (linkPlayer ya maneja el caso de re-link).
async function unlinkPlayer(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningun jugador vinculado');
    const tag = player.tag;
    await player.destroy();
    return ok(res, { unlinked: true, tag });
  } catch (err) { next(err); }
}

async function syncPlayer(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');
    let apiData;
    try {
      apiData = await supercell.getPlayer(player.tag);
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }
    await player.update({
      name:            apiData.name,
      trophies:        apiData.trophies,
      highestTrophies: apiData.highestTrophies,
      level:           apiData.expLevel,
      club:            apiData.club?.name || null,
      rawData:         apiData,
      lastSync:        new Date(),
    });

    // Snapshot global (no rompe si falla — solo es para gráficos)
    PlayerSnapshot.create({
      playerId:        player.id,
      trophies:        apiData.trophies,
      highestTrophies: apiData.highestTrophies,
      level:           apiData.expLevel,
      recordedAt:      new Date(),
    }).catch(() => {});

    // Acumula las batallas nuevas (deduplicadas por playerId+battleTime)
    let battlesAdded = 0;
    try {
      const raw = await supercell.getBattleLog(player.tag);
      for (const b of raw) {
        const norm = normalizeBattle(b, player.tag);
        if (!norm) continue;
        const [, created] = await Battle.findOrCreate({
          where:    { playerId: player.id, battleTime: norm.battleTime },
          defaults: { ...norm, playerId: player.id },
        });
        if (created) battlesAdded++;
      }
    } catch { /* battlelog opcional, no rompe el sync */ }

    return ok(res, { ...player.toJSON(), battlesAdded });
  } catch (err) { next(err); }
}

// GET /api/v1/players/all  (admin only) — todos los players con su owner
async function getAllAdmin(req, res, next) {
  try {
    const players = await Player.findAll({
      attributes: ['id', 'tag', 'name', 'trophies', 'highestTrophies', 'level', 'club', 'lastSync', 'userId'],
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['trophies', 'DESC']],
    });
    return ok(res, players);
  } catch (err) { next(err); }
}

// POST /api/v1/players/sync-top?limit=25 (admin)
// Pobla la BBDD con los top N jugadores globales + sus battle logs.
// Sirve para que el endpoint /brawlers/winrates devuelva datos verdaderamente
// globales (no solo los del usuario actual).
async function syncTopPlayers(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 25, 50));

    // 1. Asegurar system user (dueno virtual de los Players sincronizados como datos meta)
    let systemUser = await User.findOne({ where: { email: SYSTEM_USER_EMAIL } });
    if (!systemUser) {
      const lockedHash = await bcrypt.hash('locked_' + Math.random().toString(36), 10);
      systemUser = await User.create({
        name:     'BrawlStats Meta Sync',
        email:    SYSTEM_USER_EMAIL,
        password: lockedHash,
        role:     'user',
        isActive: false,
      });
    }

    // 2. Top jugadores globales (Supercell devuelve hasta 200)
    let topPlayers;
    try {
      topPlayers = await supercell.getRanking('global');
    } catch (err) {
      const handled = handleSupercellError(err, res);
      if (handled) return handled;
      return next(err);
    }

    const tags = topPlayers.slice(0, limit).map(p => p.tag).filter(Boolean);

    let playersSynced = 0;
    let battlesAdded  = 0;
    const errors = [];

    for (const tag of tags) {
      try {
        const apiData = await supercell.getPlayer(tag);

        const [player] = await Player.findOrCreate({
          where: { tag: apiData.tag },
          defaults: {
            userId:          systemUser.id,
            tag:             apiData.tag,
            name:            apiData.name,
            trophies:        apiData.trophies,
            highestTrophies: apiData.highestTrophies,
            level:           apiData.expLevel,
            club:            apiData.club?.name || null,
            rawData:         apiData,
            lastSync:        new Date(),
          },
        });
        await player.update({
          name:            apiData.name,
          trophies:        apiData.trophies,
          highestTrophies: apiData.highestTrophies,
          level:           apiData.expLevel,
          club:            apiData.club?.name || null,
          rawData:         apiData,
          lastSync:        new Date(),
        });

        try {
          const battles = await supercell.getBattleLog(tag);
          for (const b of battles) {
            const norm = normalizeBattle(b, tag);
            if (!norm) continue;
            const [, isNew] = await Battle.findOrCreate({
              where:    { playerId: player.id, battleTime: norm.battleTime },
              defaults: { ...norm, playerId: player.id },
            });
            if (isNew) battlesAdded++;
          }
        } catch (err) {
          console.warn(`[syncTopPlayers] battlelog ${tag} fallo:`, err.message);
        }

        playersSynced++;
      } catch (err) {
        const status = err.response?.status;
        errors.push({ tag, status, msg: err.message });
        console.warn(`[syncTopPlayers] ${tag} fallo: ${status || ''} ${err.message}`);
      }
    }

    return ok(res, {
      playersSynced,
      battlesAdded,
      attempted: tags.length,
      errors:    errors.slice(0, 10),
    });
  } catch (err) { next(err); }
}

module.exports = { searchByTag, linkPlayer, getMyPlayer, unlinkPlayer, syncPlayer, getAllAdmin, syncTopPlayers, getByTagPublic };
