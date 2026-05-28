const router = require('express').Router();
const ctrl   = require('../controllers/stats.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get ('/me',                 protect, ctrl.getMyStats);
router.get ('/winrate',            protect, ctrl.getWinRate);
router.get ('/battlelog',          protect, ctrl.getBattleLog);
router.get ('/trophy-history',     protect, ctrl.getTrophyHistory);
router.get ('/streak',             protect, ctrl.getStreak);
router.get ('/mode-distribution',  protect, ctrl.getModeDistribution);
router.get ('/favorite-brawler',   protect, ctrl.getFavoriteBrawler);
router.get ('/tierlist',                    ctrl.getTierlist);
router.post('/snapshot',           protect, ctrl.saveSnapshot);

module.exports = router;