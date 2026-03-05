const router = require('express').Router();
const ctrl   = require('../controllers/player.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

router.get   ('/search',      protect, ctrl.searchByTag);
router.get   ('/all',         protect, adminOnly, ctrl.getAllAdmin);
router.get   ('/me',          protect, ctrl.getMyPlayer);
router.delete('/me',          protect, ctrl.unlinkPlayer);
router.get   ('/by-tag/:tag', protect, ctrl.getByTagPublic);
router.post  ('/',            protect, ctrl.linkPlayer);
router.post  ('/sync',        protect, ctrl.syncPlayer);
router.post  ('/sync-top',    protect, adminOnly, ctrl.syncTopPlayers);

module.exports = router;
