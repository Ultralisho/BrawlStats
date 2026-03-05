function errorHandler(err, req, res, next) {
  // Log enriquecido con name + stack para diagnosticar
  console.error(`[ERROR] ${req.method} ${req.path}`);
  console.error(`  name:    ${err.name}`);
  console.error(`  message: ${err.message}`);
  if (err.original) console.error(`  sql:     ${err.original.sqlMessage || err.original.message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') console.error(err.stack);

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.errors?.map(e => e.message),
    });
  }

  // Error JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
