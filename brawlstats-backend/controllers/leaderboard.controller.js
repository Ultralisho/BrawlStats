const supercell = require('../services/supercell.service');
const { Player } = require('../models');
const { ok }     = require('../utils/apiResponse');
const { Op }     = require('sequelize');

// GET /api/v1/leaderboard/global
async function global(req, res, next) {
  try {
    const data = await supercell.getRanking('global');
    return ok(res, data);
  } catch (err) { next(err); }
}

// GET /api/v1/leaderboard/country/:code  ej: ES
async function byCountry(req, res, next) {
  try {
    const data = await supercell.getRanking(req.params.code);
    return ok(res, data);
  } catch (err) { next(err); }
}

// GET /api/v1/leaderboard/local
// Ranking de jugadores registrados en BrawlStats, ordenado por trofeos
async function local(req, res, next) {
  try {
    const players = await Player.findAll({
      order: [['trophies', 'DESC']],
      limit: 100,
    });
    return ok(res, players);
  } catch (err) { next(err); }
}

module.exports = { global, byCountry, local };
