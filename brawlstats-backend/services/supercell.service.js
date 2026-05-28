const axios = require('axios');

const client = axios.create({
  baseURL: process.env.BRAWL_API_URL || 'https://api.brawlstars.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.BRAWL_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// El tag lleva # que hay que encodear como %23
function encodeTag(tag) {
  return encodeURIComponent(tag.startsWith('#') ? tag : `#${tag}`);
}

// Obtiene perfil completo de un jugador
async function getPlayer(tag) {
  const { data } = await client.get(`/players/${encodeTag(tag)}`);
  return data;
}

// Obtiene las batallas recientes de un jugador (máx 25)
async function getBattleLog(tag) {
  const { data } = await client.get(`/players/${encodeTag(tag)}/battlelog`);
  return data.items || [];
}

// Obtiene todos los brawlers del juego
async function getAllBrawlers() {
  const { data } = await client.get('/brawlers');
  return data.items || [];
}

// Obtiene un brawler concreto por id (incluye starPowers y gadgets)
async function getBrawlerById(id) {
  const { data } = await client.get(`/brawlers/${id}`);
  return data;
}

// LEGACY. Mantenido por compatibilidad; el endpoint
// /rankings/{country}/brawlers/{id}/players fue retirado por Supercell y
// ahora devuelve 404. Para top players por brawler usar
// getTopPlayersForBrawler(), que reconstruye el ranking desde el global.
async function getBrawlerRanking(id, countryCode = 'global') {
  const { data } = await client.get(`/rankings/${countryCode}/brawlers/${id}/players`);
  return data.items || [];
}

// Ranking global de jugadores (top 200 de un país o global)
async function getRanking(countryCode = 'global') {
  const { data } = await client.get(`/rankings/${countryCode}/players`);
  return data.items || [];
}

// Rotación de eventos actuales
async function getEventRotation() {
  const { data } = await client.get('/events/rotation');
  // La API devuelve el array directamente, sin wrapper { items: [...] }
  return Array.isArray(data) ? data : (data.items || []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Top players por brawler — implementación robusta
//
// Como /rankings/{country}/brawlers/{id}/players devuelve 404, reconstruimos
// el ranking así:
//   1) Cogemos el top global de jugadores (/rankings/global/players, 200 max).
//   2) Para los primeros `scanLimit` jugadores leemos su profile completo
//      (/players/{tag}), que sí incluye brawlers[] con trophies por brawler.
//   3) Filtramos por brawlerId y ordenamos por trophies DESC.
//   4) Devolvemos top N enriquecido con avatar/club/país.
//
// Cacheamos:
//   - el ranking global (TTL 10 min)
//   - cada profile individual (TTL 10 min)
// y respetamos el rate-limit con concurrencia controlada (Promise.all en
// lotes de `concurrency` peticiones).
// ─────────────────────────────────────────────────────────────────────────────

const TTL_MS = 10 * 60 * 1000;
let _globalRankCache = { data: null, ts: 0, countryCode: null };
const _profileCache  = new Map(); // tag → { data, ts }

async function getCachedGlobalRanking(countryCode = 'global') {
  if (
    _globalRankCache.data &&
    _globalRankCache.countryCode === countryCode &&
    Date.now() - _globalRankCache.ts < TTL_MS
  ) {
    return _globalRankCache.data;
  }
  const items = await getRanking(countryCode);
  _globalRankCache = { data: items, ts: Date.now(), countryCode };
  return items;
}

async function getCachedPlayer(tag) {
  const cached = _profileCache.get(tag);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
  try {
    const data = await getPlayer(tag);
    _profileCache.set(tag, { data, ts: Date.now() });
    return data;
  } catch (err) {
    // Profile individual fallido (404, 503...): no cacheamos error,
    // simplemente devolvemos null para que el caller lo salte.
    return null;
  }
}

// Promise.all por lotes para no saturar el rate limit de Supercell.
async function inBatches(items, concurrency, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const res   = await Promise.all(slice.map(fn));
    out.push(...res);
  }
  return out;
}

/**
 * Top jugadores con un brawler concreto, reconstruido desde el ranking global.
 *
 * @param {number} brawlerId      ID Supercell del brawler.
 * @param {object} [opts]
 * @param {number} [opts.topN=5]         Cuántos jugadores devolver.
 * @param {number} [opts.scanLimit=30]   Cuántos del top global escanear.
 * @param {number} [opts.concurrency=5]  Profiles en paralelo por lote.
 * @param {string} [opts.countryCode]    'global' o ISO 2 letras.
 * @returns {Promise<Array>} top N enriquecidos.
 */
async function getTopPlayersForBrawler(brawlerId, opts = {}) {
  const topN        = opts.topN        ?? 5;
  const scanLimit   = opts.scanLimit   ?? 30;
  const concurrency = opts.concurrency ?? 5;
  const countryCode = opts.countryCode ?? 'global';

  const targetId = Number(brawlerId);
  if (!Number.isFinite(targetId)) return [];

  const rank = await getCachedGlobalRanking(countryCode);
  const scan = rank.slice(0, scanLimit);
  if (scan.length === 0) return [];

  // Leemos profiles en lotes para no saturar el rate limit
  const profiles = await inBatches(scan, concurrency, async (p) => {
    if (!p?.tag) return null;
    const profile = await getCachedPlayer(p.tag);
    return profile ? { rankEntry: p, profile } : null;
  });

  // Filtrado por brawler y ordenación por trofeos DESC
  const matches = [];
  for (const entry of profiles) {
    if (!entry) continue;
    const ownership = (entry.profile.brawlers || []).find(b => Number(b.id) === targetId);
    if (!ownership || ownership.trophies == null) continue;
    matches.push({
      tag:      entry.profile.tag       || entry.rankEntry.tag,
      name:     entry.profile.name      || entry.rankEntry.name,
      icon:     entry.profile.icon      || entry.rankEntry.icon || null,
      club:     entry.profile.club?.name || entry.rankEntry.club?.name || null,
      country:  entry.rankEntry.country || entry.rankEntry.countryCode || null,
      trophies: ownership.trophies,
      highestTrophies: ownership.highestTrophies ?? null,
    });
  }

  matches.sort((a, b) => b.trophies - a.trophies);
  return matches.slice(0, topN).map((m, i) => ({ ...m, rank: i + 1 }));
}

module.exports = {
  getPlayer,
  getBattleLog,
  getAllBrawlers,
  getBrawlerById,
  getBrawlerRanking,
  getRanking,
  getEventRotation,
  getTopPlayersForBrawler,
};
