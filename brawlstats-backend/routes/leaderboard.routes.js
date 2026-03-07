const router = require('express').Router();
const ctrl   = require('../controllers/leaderboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/global',        ctrl.global);
router.get('/country/:code', ctrl.byCountry);
router.get('/local',         protect, ctrl.local);

module.exports = router;
