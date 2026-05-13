const router = require('express').Router();
const ctrl   = require('../controllers/player.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get ('/search', protect, ctrl.searchByTag);
router.get ('/me',     protect, ctrl.getMyPlayer);
router.post('/',       protect, ctrl.linkPlayer);
router.post('/sync',   protect, ctrl.syncPlayer);

module.exports = router;
