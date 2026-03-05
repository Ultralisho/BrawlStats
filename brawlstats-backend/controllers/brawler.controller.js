const axios           = require('axios');
const { Op }          = require('sequelize');
const { sequelize, Brawler, Battle } = require('../models');
const supercell       = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');

const BRAWLAPI_BASE = 'https://api.brawlapi.com/v1';
const brawlApi = axios.create({ baseURL: BRAWLAPI_BASE, timeout: 8000 });

const MODE_LABEL_TO_KEY = {
  'Gem Grab':'gemGrab', 'Brawl Ball':'brawlBall', 'Showdown':'showdown',
  'Solo Showdown':'soloShowdown', 'Duo Showdown':'duoShowdown', 'Hot Zone':'hotZone',
  'Knockout':'knockout', 'Bounty':'bounty', 'Heist':'heist', 'Duels':'duels',
  'Wipeout':'wipeout', 'Siege':'siege', 'Basket Brawl':'basketBrawl',
  'Hold The Trophy':'holdTheTrophy', 'Bot Drop':'botDrop',
};

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

async function getMaps(_req, res, next) {
  try {
    const { data } = await brawlApi.get('/maps');
    const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []);
    return ok(res, list);
  } catch (err) {
    if (err.response?.status === 404) return ok(res, []);
    return next(err);
  }
}

async function getMapById(req, res, next) {
  try {
    const { data } = await brawlApi.get(`/maps/${encodeURIComponent(req.params.id)}`);
    return ok(res, data);
  } catch (err) {
    if (err.response?.status === 404) return notFound(res, 'Mapa no encontrado');
    return next(err);
  }
}

// Winrate global agregado por brawler a partir de la tabla `Battle`
// (todas las batallas sincronizadas por todos los usuarios).
// Devuelve TODOS los brawlers del catalogo; los que no tienen partidas
// suficientes (< MIN_SAMPLES por defecto 5) se devuelven con winRate=null
// para evitar resultados poco fiables (ej. 100% winrate con 1 partida).
async function getWinrates(req, res, next) {
  try {
    const modeLabel = req.query.mode;
    const minSamples = Math.max(1, parseInt(req.query.minSamples, 10) || 5);

    let modeKey = null;
    if (modeLabel && modeLabel !== 'Global' && modeLabel !== 'all') {
      modeKey = MODE_LABEL_TO_KEY[modeLabel] || modeLabel;
    }

    const where = { brawler: { [Op.ne]: null } };
    if (modeKey) where.mode = modeKey;

    const rows = await Battle.findAll({
      attributes: [
        'brawler',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.literal("SUM(CASE WHEN result = 'Win'  THEN 1 ELSE 0 END)"), 'wins'],
        [sequelize.literal("SUM(CASE WHEN result = 'Loss' THEN 1 ELSE 0 END)"), 'losses'],
      ],
      where,
      group: ['brawler'],
      raw: true,
    });

    const byName = new Map();
    for (const r of rows) {
      const games  = Number(r.total)  || 0;
      const wins   = Number(r.wins)   || 0;
      const losses = Number(r.losses) || 0;
      byName.set(r.brawler, {
        games, wins, losses,
        // Solo calcula winrate si hay muestra suficiente
        winRate: games >= minSamples ? Math.round((wins / games) * 100) : null,
      });
    }

    const brawlers = await Brawler.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'rarity', 'role'],
      order: [['name', 'ASC']],
    });

    const data = brawlers.map(b => {
      const stats = byName.get(b.name) || { games: 0, wins: 0, losses: 0, winRate: null };
      return {
        id:      b.id,
        name:    b.name,
        rarity:  b.rarity,
        role:    b.role,
        games:   stats.games,
        wins:    stats.wins,
        losses:  stats.losses,
        winRate: stats.winRate,
      };
    });

    return ok(res, data, {
      meta: {
        mode:       modeLabel || 'Global',
        total:      data.length,
        minSamples,
        withData:   data.filter(d => d.winRate != null).length,
        totalGames: data.reduce((s, d) => s + d.games, 0),
      },
    });
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, getFull, getRanking, syncFromApi, update, getMaps, getMapById, getWinrates };
