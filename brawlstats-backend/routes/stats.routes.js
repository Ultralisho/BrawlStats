const router = require('express').Router();
const ctrl   = require('../controllers/stats.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get ('/me',       protect, ctrl.getMyStats);
router.get ('/winrate',  protect, ctrl.getWinRate);
router.post('/snapshot', protect, ctrl.saveSnapshot);

module.exports = router;
