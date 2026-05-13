const { Player, Stat, Brawler } = require('../models');
const supercell = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');

// GET /api/v1/players/search?tag=#XXXXXX
// Busca en la API de Supercell sin guardar en BD
async function searchByTag(req, res, next) {
  try {
    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: 'Falta el parámetro tag' });

    const data = await supercell.getPlayer(tag);
    return ok(res, data);
  } catch (err) {
    if (err.response?.status === 404) return notFound(res, 'Jugador no encontrado');
    next(err);
  }
}

// POST /api/v1/players  — vincula un tag al usuario autenticado
async function linkPlayer(req, res, next) {
  try {
    const { tag } = req.body;

    // Comprueba que el tag existe en Supercell
    const apiData = await supercell.getPlayer(tag);

    const [player, created_] = await Player.findOrCreate({
      where: { tag: apiData.tag },
      defaults: {
        userId:          req.user.id,
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

    return created_ ? created(res, player) : ok(res, player);
  } catch (err) {
    if (err.response?.status === 404) return notFound(res, 'Jugador no encontrado en Brawl Stars');
    next(err);
  }
}

// GET /api/v1/players/me  — jugador vinculado al usuario autenticado
async function getMyPlayer(req, res, next) {
  try {
    const player = await Player.findOne({
      where: { userId: req.user.id },
      include: [{ model: Stat, as: 'stats', limit: 50, order: [['recordedAt','DESC']] }],
    });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');
    return ok(res, player);
  } catch (err) { next(err); }
}

// POST /api/v1/players/sync  — sincroniza datos desde la API de Supercell
async function syncPlayer(req, res, next) {
  try {
    const player = await Player.findOne({ where: { userId: req.user.id } });
    if (!player) return notFound(res, 'No tienes ningún jugador vinculado');

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

    return ok(res, player);
  } catch (err) { next(err); }
}

module.exports = { searchByTag, linkPlayer, getMyPlayer, syncPlayer };
