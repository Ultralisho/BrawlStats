const router = require('express').Router();
const ctrl   = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get   ('/',     protect, ctrl.getAll);
router.post  ('/',     protect, ctrl.create);
router.delete('/:id',  protect, ctrl.remove);

module.exports = router;
