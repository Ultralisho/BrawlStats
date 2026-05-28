const router = require('express').Router();
const axios  = require('axios');

const BRAWLAPI_BASE = 'https://api.brawlapi.com/v1';

const brawlApi = axios.create({
  baseURL: BRAWLAPI_BASE,
  timeout: 10000,
  headers: {
    // Algunas APIs comunitarias bloquean peticiones sin User-Agent
    'User-Agent': 'BrawlStats-TFG/1.0 (Node.js proxy)',
    'Accept': 'application/json',
  },
});

async function proxy(path, res) {
  const fullUrl = BRAWLAPI_BASE + path;
  try {
    const { data } = await brawlApi.get(path);
    return res.json(data);
  } catch (err) {
    // Log detallado para diagnosticar
    console.error(`[brawlapi-proxy] GET ${fullUrl} fallo:`, {
      code:    err.code,
      message: err.message,
      status:  err.response?.status,
      body:    err.response?.data,
    });

    if (err.response) {
      // BrawlAPI respondio con error HTTP
      return res.status(err.response.status).json({
        error:   true,
        message: `BrawlAPI devolvio ${err.response.status}`,
        status:  err.response.status,
        upstream: err.response.data,
      });
    }
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({
        error:   true,
        message: 'BrawlAPI no respondio a tiempo (timeout)',
        status:  504,
      });
    }
    return res.status(502).json({
      error:   true,
      message: 'No se pudo conectar con BrawlAPI: ' + err.message,
      status:  502,
    });
  }
}

router.get('/events',       (_req, res) => proxy('/events',   res));
router.get('/brawlers',     (_req, res) => proxy('/brawlers', res));
router.get('/brawlers/:id', (req,  res) => proxy('/brawlers/' + req.params.id, res));
router.get('/maps',         (_req, res) => proxy('/maps',     res));
// Detalle de mapa: ya hay un proxy equivalente en /api/v1/brawlers/maps/:id
// que es el que consume el frontend (REACT_APP_API_URL=/api/v1). No duplicamos
// aqui para evitar tener dos endpoints identicos.

module.exports = router;
