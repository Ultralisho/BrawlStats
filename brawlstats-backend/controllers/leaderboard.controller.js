const supercell = require('../services/supercell.service');
const { Player } = require('../models');
const { ok }     = require('../utils/apiResponse');

async function global(req, res, next) {
  try {
    const data = await supercell.getRanking('global');
    return ok(res, data);
  } catch (err) {
    if (err.response?.status === 403)
      return ok(res, [], { warning: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
    if (err.response?.status === 404)
      return ok(res, []);
    next(err);
  }
}

async function byCountry(req, res, next) {
  try {
    const { code } = req.params;
    if (!/^[A-Za-z]{2}$/.test(code))
      return ok(res, [], { warning: 'Código de país inválido. Usa formato ISO 2 letras (ej: ES, US)' });
    const data = await supercell.getRanking(code.toUpperCase());
    return ok(res, data);
  } catch (err) {
    if (err.response?.status === 403)
      return ok(res, [], { warning: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
    if (err.response?.status === 404)
      return ok(res, [], { warning: `No hay ranking disponible para ese país` });
    next(err);
  }
}

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
