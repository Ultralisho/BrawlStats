const { Tutorial } = require('../models');
const { ok, created, notFound } = require('../utils/apiResponse');

async function list(req, res, next) {
  try {
    const tutorials = await Tutorial.findAll({
      order: [['createdAt', 'ASC']],
    });
    return ok(res, tutorials);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { title, description, category, brawler, youtubeQuery, level } = req.body;
    const t = await Tutorial.create({
      title,
      description,
      category: category || 'Básico',
      brawler: brawler || null,
      youtubeQuery: youtubeQuery || null,
      level: level || 'Básico',
    });
    return created(res, t);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const t = await Tutorial.findByPk(req.params.id);
    if (!t) return notFound(res, 'Tutorial no encontrado');
    const { title, description, category, brawler, youtubeQuery, level } = req.body;
    await t.update({ title, description, category, brawler, youtubeQuery, level });
    return ok(res, t);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const t = await Tutorial.findByPk(req.params.id);
    if (!t) return notFound(res, 'Tutorial no encontrado');
    await t.destroy();
    return ok(res, { deleted: true });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
