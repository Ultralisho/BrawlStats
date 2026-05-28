const router = require('express').Router();
const ctrl   = require('../controllers/tutorial.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

// Públicos
router.get ('/', ctrl.list);
router.post('/', ctrl.create);

// Admin (mantener compatibilidad con el panel)
router.get   ('/admin',     protect, adminOnly, ctrl.list);
router.post  ('/admin',     protect, adminOnly, ctrl.create);
router.put   ('/admin/:id', protect, adminOnly, ctrl.update);
router.delete('/admin/:id', protect, adminOnly, ctrl.remove);

module.exports = router;
