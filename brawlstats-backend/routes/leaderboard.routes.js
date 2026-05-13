const router = require('express').Router();
const ctrl   = require('../controllers/leaderboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/global',        protect, ctrl.global);
router.get('/country/:code', protect, ctrl.byCountry);
router.get('/local',         protect, ctrl.local);

module.exports = router;
