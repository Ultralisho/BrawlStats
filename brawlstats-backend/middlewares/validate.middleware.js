const { validationResult } = require('express-validator');

// Usa este middleware después de los arrays de validación de express-validator
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos no válidos',
      details: errors.array().map(e => `${e.path}: ${e.msg}`),
    });
  }
  next();
}

module.exports = { validate };
