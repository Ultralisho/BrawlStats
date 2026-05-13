const { Brawler }     = require('../models');
const supercell       = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');

// GET /api/v1/brawlers
async function getAll(req, res, next) {
  try {
    const brawlers = await Brawler.findAll({ where: { isActive: true }, order: [['name','ASC']] });
    return ok(res, brawlers);
  } catch (err) { next(err); }
}

// GET /api/v1/brawlers/:id
async function getOne(req, res, next) {
  try {
    const b = await Brawler.findByPk(req.params.id);
    if (!b) return notFound(res, 'Brawler no encontrado');
    return ok(res, b);
  } catch (err) { next(err); }
}

// POST /api/v1/brawlers/sync  (admin) — sincroniza brawlers desde la API de Supercell
async function syncFromApi(req, res, next) {
  try {
    const items = await supercell.getAllBrawlers();
    let count = 0;

    for (const item of items) {
      await Brawler.upsert({
        id:       item.id,
        name:     item.name,
        rarity:   item.rarity?.name?.toLowerCase().replace(' ','_') || 'common',
        role:     item.class?.name || null,
      });
      count++;
    }

    return ok(res, { synced: count });
  } catch (err) { next(err); }
}

// PUT /api/v1/brawlers/:id  (admin)
async function update(req, res, next) {
  try {
    const b = await Brawler.findByPk(req.params.id);
    if (!b) return notFound(res, 'Brawler no encontrado');
    await b.update(req.body);
    return ok(res, b);
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, syncFromApi, update };
