const axios           = require('axios');
const { Op }          = require('sequelize');
const { sequelize, Brawler, Battle, DatasetBattle } = require('../models');
const supercell       = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');

const BRAWLAPI_BASE = 'https://api.brawlapi.com/v1';
const brawlApi = axios.create({ baseURL: BRAWLAPI_BASE, timeout: 15000 });

// ── In-memory caches ──────────────────────────────────────────────────────────
const _wrCache   = new Map();          // winrates: key → { data, meta, ts }
const WR_TTL     = 5 * 60 * 1000;     // 5 min

let _mapsCache    = null;
let _mapsCachedAt = 0;
const MAPS_TTL    = 10 * 60 * 1000;   // 10 min

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

// Top 5 de jugadores con más trofeos con este brawler.
//
// El endpoint /rankings/{country}/brawlers/{id}/players de Supercell devuelve
// 404 desde que lo retiraron. Estrategia robusta usando SOLO la API oficial:
//   - getTopPlayersForBrawler() coge el ranking global de jugadores y, para
//     los primeros 30, lee su profile completo (Promise.all en lotes, cache
//     10 min). Filtra por brawlerId y devuelve los top 5 por trofeos con
//     ese brawler concreto.
// Ante 403 devolvemos 502 con mensaje claro. Ante cualquier otra cosa, [].
async function getRanking(req, res, next) {
  try {
    const id = req.params.id;
    const brawler = await Brawler.findByPk(id);
    if (!brawler) return notFound(res, 'Brawler no encontrado');

    let top5;
    try {
      top5 = await supercell.getTopPlayersForBrawler(id, {
        topN: 5,
        scanLimit: 30,
        concurrency: 5,
      });
    } catch (err) {
      if (err.response?.status === 403) {
        return res.status(502).json({
          success: false,
          error: 'API de Brawl Stars no disponible: token inválido o IP no autorizada',
        });
      }
      // Otros errores transitorios → devolvemos vacío con 200 para no romper
      // la UI; el frontend muestra "Sin datos".
      top5 = [];
    }

    const out = (top5 || []).map(p => ({
      rank:            p.rank,
      tag:             p.tag,
      name:            p.name,
      trophies:        p.trophies,
      highestTrophies: p.highestTrophies ?? null,
      club:            p.club,
      country:         p.country,
      icon:            p.icon || null,
    }));

    return ok(res, out);
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
    if (_mapsCache && Date.now() - _mapsCachedAt < MAPS_TTL) {
      return ok(res, _mapsCache);
    }
    const { data } = await brawlApi.get('/maps');
    const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []);
    _mapsCache = list; _mapsCachedAt = Date.now();
    return ok(res, list);
  } catch (err) {
    if (_mapsCache) return ok(res, _mapsCache);  // serve stale on timeout
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

// Winrate global agregado por brawler — con caché 5 min y normalización de case.
async function getWinrates(req, res, next) {
  try {
    const modeLabel  = req.query.mode;
    const minSamples = Math.max(1, parseInt(req.query.minSamples, 10) || 5);

    let modeKey = null;
    if (modeLabel && modeLabel !== 'Global' && modeLabel !== 'all') {
      modeKey = MODE_LABEL_TO_KEY[modeLabel] || modeLabel;
    }

    const cacheKey = `${modeKey || '__all__'}|${minSamples}`;
    const cached   = _wrCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < WR_TTL) {
      return ok(res, cached.data, { meta: cached.meta });
    }

    const where = {
      brawler: { [Op.notIn]: ['?', ''], [Op.ne]: null },
      result:  { [Op.in]: ['Win', 'Loss', 'Draw'] },
    };
    if (modeKey) where.mode = modeKey;

    const datasetCount = await DatasetBattle.count();
    const [source, totalInDB, sourceLabel] = datasetCount > 0
      ? [DatasetBattle, datasetCount, 'dataset']
      : [Battle, await Battle.count(), 'users'];

    const rows = await source.findAll({
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

    // Normalize to uppercase so seed-cased names ("Colt") match dataset names ("COLT")
    const byName = new Map();
    for (const r of rows) {
      const games  = Number(r.total)  || 0;
      const wins   = Number(r.wins)   || 0;
      const losses = Number(r.losses) || 0;
      byName.set((r.brawler || '').toUpperCase(), {
        games, wins, losses,
        winRate: games >= minSamples ? Math.round((wins / games) * 100) : null,
      });
    }

    const brawlers = await Brawler.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'rarity', 'role'],
      order: [['name', 'ASC']],
    });

    const data = brawlers.map(b => {
      const stats = byName.get((b.name || '').toUpperCase()) || { games: 0, wins: 0, losses: 0, winRate: null };
      return { id: b.id, name: b.name, rarity: b.rarity, role: b.role, ...stats };
    });

    const meta = {
      mode:       modeLabel || 'Global',
      source:     sourceLabel,
      total:      data.length,
      minSamples,
      withData:   data.filter(d => d.winRate != null).length,
      totalGames: data.reduce((s, d) => s + d.games, 0),
      totalInDB,
    };

    _wrCache.set(cacheKey, { data, meta, ts: Date.now() });
    return ok(res, data, { meta });
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, getFull, getRanking, syncFromApi, update, getMaps, getMapById, getWinrates };
