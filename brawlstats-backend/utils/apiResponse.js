// Todas las respuestas siguen el mismo formato { success, data/error, meta }

function ok(res, data, meta = {}) {
  return res.json({ success: true, data, ...meta });
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function notFound(res, message = 'Recurso no encontrado') {
  return res.status(404).json({ success: false, error: message });
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

function unauthorized(res, message = 'No autenticado') {
  return res.status(401).json({ success: false, error: message });
}

function forbidden(res, message = 'Acceso denegado') {
  return res.status(403).json({ success: false, error: message });
}

module.exports = { ok, created, notFound, badRequest, unauthorized, forbidden };
