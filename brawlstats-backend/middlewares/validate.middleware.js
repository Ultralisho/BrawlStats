const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    return res.status(400).json({
      success: false,
      error:   list[0].msg,           // primer error legible para el frontend
      details: list.map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
