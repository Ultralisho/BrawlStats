const router = require('express').Router();
const ctrl   = require('../controllers/brawler.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

router.get ('/',       protect,            ctrl.getAll);
router.get ('/:id',    protect,            ctrl.getOne);
router.post('/sync',   protect, adminOnly, ctrl.syncFromApi);
router.put ('/:id',    protect, adminOnly, ctrl.update);

module.exports = router;
