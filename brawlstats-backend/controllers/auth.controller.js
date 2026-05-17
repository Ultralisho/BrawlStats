const bcrypt           = require('bcryptjs');
const path             = require('path');
const fs               = require('fs');
const { User, Player, Battle, PlayerSnapshot, Stat, Report } = require('../models');
const { generateToken }= require('../utils/jwt');
const { ok, created, badRequest, notFound } = require('../utils/apiResponse');

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

// GET /api/v1/auth/me
async function me(req, res) {
  return ok(res, req.user);
}

// PUT /api/v1/auth/me
async function updateMe(req, res, next) {
  try {
    const { name, country } = req.body;
    await req.user.update({ name, country });
    return ok(res, req.user);
  } catch (err) { next(err); }
}

// PUT /api/v1/auth/change-password
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

// GET /api/v1/auth/users  (admin only)
async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    return ok(res, users);
  } catch (err) { next(err); }
}

// PUT /api/v1/auth/users/:id  (admin only)
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!user) return badRequest(res, 'Usuario no encontrado');
    await user.update({ isActive });
    return ok(res, { id: user.id, isActive: user.isActive });
  } catch (err) { next(err); }
}

// PUT /api/v1/auth/users/:id/role  (admin only)
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return badRequest(res, 'Rol invalido');
    if (id === req.user.id) return badRequest(res, 'No puedes cambiar tu propio rol');
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!user) return notFound(res, 'Usuario no encontrado');
    await user.update({ role });
    return ok(res, { id: user.id, role: user.role });
  } catch (err) { next(err); }
}

// DELETE /api/v1/auth/users/:id  (admin only)
// Borra usuario + cascade (player vinculado, batallas, snapshots, stats, reportes y sus PDFs).
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) return badRequest(res, 'No puedes eliminar tu propia cuenta desde aqui');
    const user = await User.findByPk(id);
    if (!user) return notFound(res, 'Usuario no encontrado');

    // Player vinculado (si existe) y todos sus datos derivados
    const player = await Player.findOne({ where: { userId: id } });
    if (player) {
      await Battle.destroy({         where: { playerId: player.id } });
      await PlayerSnapshot.destroy({ where: { playerId: player.id } });
      await Stat.destroy({           where: { playerId: player.id } });
      await player.destroy();
    }

    // Reportes y sus ficheros en disco
    const reports = await Report.findAll({ where: { userId: id } });
    for (const r of reports) {
      if (r.filePath) {
        const abs = path.join(__dirname, '..', r.filePath);
        if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
      }
      await r.destroy();
    }

    await user.destroy();
    return ok(res, { id, deleted: true });
  } catch (err) { next(err); }
}

module.exports = {
  register, login, me, updateMe, changePassword,
  listUsers, updateUserStatus, updateUserRole, deleteUser,
};