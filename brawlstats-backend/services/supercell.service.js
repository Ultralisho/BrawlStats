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

// Ranking global de jugadores con un brawler concreto
async function getBrawlerRanking(id) {
  const { data } = await client.get(`/rankings/global/brawlers/${id}/players`);
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

module.exports = { getPlayer, getBattleLog, getAllBrawlers, getBrawlerById, getBrawlerRanking, getRanking, getEventRotation };
