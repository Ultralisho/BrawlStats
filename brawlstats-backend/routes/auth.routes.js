const router   = require('express').Router();
const ctrl     = require('../controllers/auth.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { body } = require('express-validator');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Nombre obligatorio'),
  body('email').isEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
];
const loginRules = [
  body('email').isEmail().withMessage('Email no válido'),
  body('password').notEmpty().withMessage('Contraseña obligatoria'),
];

router.post('/register',         registerRules, validate, ctrl.register);
router.post('/login',            loginRules,    validate, ctrl.login);
router.get ('/me',               protect,                 ctrl.me);
router.put ('/me',               protect,                 ctrl.updateMe);
router.put ('/change-password',  protect,                 ctrl.changePassword);

// Admin-only user management
router.get   ('/users',           protect, adminOnly, ctrl.listUsers);
router.put   ('/users/:id',       protect, adminOnly, ctrl.updateUserStatus);
router.put   ('/users/:id/role',  protect, adminOnly, ctrl.updateUserRole);
router.delete('/users/:id',       protect, adminOnly, ctrl.deleteUser);

module.exports = router;