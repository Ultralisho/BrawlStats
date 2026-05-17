const { Brawler }     = require('../models');
const supercell       = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');

async function getAll(req, res, next) {
  try {
    const brawlers = await Brawler.findAll({ where: { isActive: true }, order: [['name','ASC']] });
    return ok(res, brawlers);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const b = await Brawler.findByPk(req.params.id);
    if (!b) return notFound(res, 'Brawler no encontrado');
    return ok(res, b);
  } catch (err) { next(err); }
}

async function syncFromApi(req, res, next) {
  try {
    let items;
    try {
      items = await supercell.getAllBrawlers();
    } catch (err) {
      if (err.response?.status === 403)
        return res.status(502).json({ success: false, error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
      return next(err);
    }

    let count = 0;
    for (const item of items) {
      await Brawler.upsert({
        id:       item.id,
        name:     item.name,
        // Fix: replace ALL spaces, not just the first one
        rarity:   item.rarity?.name?.toLowerCase().replace(/\s+/g, '_') || 'common',
        role:     item.class?.name || null,
      });
      count++;
    }
    return ok(res, { synced: count });
  } catch (err) { next(err); }
}

function handleSupercellError(err, res) {
  if (err.response?.status === 403)
    return res.status(502).json({ success: false, error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
  if (err.response?.status === 404)
    return res.status(404).json({ success: false, error: 'Brawler no encontrado en la API de Brawl Stars' });
  return null;
}

// Devuelve los datos completos del brawler.
// Estrategia: siempre intenta refrescar contra Supercell. Si Supercell falla
// (403/404) y hay rawData en caché, sirve el caché. Si no hay caché y
// Supercell falla → 503.
async function getFull(req, res, next) {
  try {
    const id = req.params.id;
    const brawler = await Brawler.findByPk(id);
    if (!brawler) return notFound(res, 'Brawler no encontrado');

    let scData = null;
    try {
      scData = await supercell.getBrawlerById(id);
      // Persistimos el bruto de Supercell { id, name, starPowers, gadgets }
      await brawler.update({ rawData: scData, rawDataUpdatedAt: new Date() });
    } catch (err) {
      const status = err.response?.status;
      if ((status === 403 || status === 404) && brawler.rawData) {
        // Fallback al caché
        scData = brawler.rawData;
      } else if (status === 403 || status === 404) {
        return res.status(503).json({
          success: false,
          error:   'Datos de Brawl Stars no disponibles ahora mismo. Inténtalo más tarde.',
        });
      } else {
        return next(err);
      }
    }

    // Merge final: starPowers / gadgets / name vienen del bruto de Supercell;
    // rarity / role / description / imageUrl se mantienen desde la DB.
    const merged = {
      id:          brawler.id,
      name:        scData?.name ?? brawler.name,
      rarity:      brawler.rarity,
      role:        brawler.role,
      description: brawler.description,
      imageUrl:    brawler.imageUrl,
      starPowers:  scData?.starPowers || [],
      gadgets:     scData?.gadgets    || [],
    };
    return ok(res, merged);
  } catch (err) { next(err); }
}

// Top 5 de jugadores con más trofeos con este brawler
async function getRanking(req, res, next) {
  try {
    const id = req.params.id;
    const brawler = await Brawler.findByPk(id);
    if (!brawler) return notFound(res, 'Brawler no encontrado');

    let items;
    try {
      items = await supercell.getBrawlerRanking(id);
    } catch (err) {
      // Si Supercell devuelve 404 para este brawler (no está rankeado aún,
      // o id no aparece en el ranking global), devolvemos lista vacía
      // en vez de propagar el 404 — el frontend mostrará "Sin datos".
      if (err.response?.status === 404) return ok(res, []);
      if (err.response?.status === 403)
        return res.status(502).json({ success: false, error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
      return next(err);
    }

    const top5 = items.slice(0, 5).map(p => ({
      tag:      p.tag,
      name:     p.name,
      trophies: p.trophies,
      rank:     p.rank,
      club:     p.club?.name || null,
    }));
    return ok(res, top5);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const b = await Brawler.findByPk(req.params.id);
    if (!b) return notFound(res, 'Brawler no encontrado');
    await b.update(req.body);
    return ok(res, b);
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, getFull, getRanking, syncFromApi, update };
