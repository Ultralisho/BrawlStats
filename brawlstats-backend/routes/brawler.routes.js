const router = require('express').Router();
const ctrl   = require('../controllers/brawler.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

router.get ('/',              ctrl.getAll);
router.get ('/maps',          ctrl.getMaps);
router.get ('/maps/:id',      ctrl.getMapById);
router.get ('/winrates',      ctrl.getWinrates);
router.get ('/:id/full',      protect, ctrl.getFull);
router.get ('/:id/ranking',   protect, ctrl.getRanking);
router.get ('/:id',           ctrl.getOne);
router.post('/sync',          protect, adminOnly, ctrl.syncFromApi);
router.put ('/:id',           protect, adminOnly, ctrl.update);

module.exports = router;
