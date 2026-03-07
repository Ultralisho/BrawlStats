const router = require('express').Router();
const ctrl   = require('../controllers/report.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

router.get   ('/all',       protect, adminOnly, ctrl.getAllAdmin);
router.delete('/admin/:id', protect, adminOnly, ctrl.removeAdmin);

router.get   ('/',            protect, ctrl.getAll);
router.post  ('/',            protect, ctrl.create);
router.get   ('/:id/download', protect, ctrl.download);
router.delete('/:id',          protect, ctrl.remove);

module.exports = router;
