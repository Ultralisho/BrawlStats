const bcrypt           = require('bcryptjs');
const { User }         = require('../models');
const { generateToken }= require('../utils/jwt');
const { ok, created, badRequest } = require('../utils/apiResponse');

// POST /api/v1/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, country } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists) return badRequest(res, 'El email ya está registrado');

    const hash = await bcrypt.hash(password, 10);
    const user  = await User.create({ name, email, password: hash, country });

    const token = generateToken(user.id, user.role);

    return created(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user) return badRequest(res, 'Credenciales incorrectas');

    const match = await bcrypt.compare(password, user.password);
    if (!match)  return badRequest(res, 'Credenciales incorrectas');

    const token = generateToken(user.id, user.role);

    return ok(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
}

// GET /api/v1/auth/me  (requiere token)
async function me(req, res) {
  return ok(res, req.user);
}

// PUT /api/v1/auth/me  (requiere token)
async function updateMe(req, res, next) {
  try {
    const { name, country } = req.body;
    await req.user.update({ name, country });
    return ok(res, req.user);
  } catch (err) { next(err); }
}

// PUT /api/v1/auth/change-password  (requiere token)
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user  = await User.findByPk(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return badRequest(res, 'Contraseña actual incorrecta');

    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hash });

    return ok(res, { message: 'Contraseña actualizada' });
  } catch (err) { next(err); }
}

module.exports = { register, login, me, updateMe, changePassword };
