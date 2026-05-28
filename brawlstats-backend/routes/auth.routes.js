const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/auth.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { body }  = require('express-validator');

// ── Rate limiters ──────────────────────────────────────────────────────────────

// Login: máx 10 intentos por IP en 15 min
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  limit:           10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo de nuevo.',
  },
  skipSuccessfulRequests: true,   // solo cuenta los intentos fallidos
});

// Register: máx 5 cuentas nuevas por IP en 1 hora
const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  limit:           5,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Demasiados registros desde esta IP. Espera 1 hora e inténtalo de nuevo.',
  },
});

// ── Reglas de validación ───────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty()      .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 50 })
                     .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ0-9 _'-]+$/)
                     .withMessage('El nombre contiene caracteres no permitidos'),

  body('email')
    .trim()
    .notEmpty()      .withMessage('El email es obligatorio')
    .isEmail()       .withMessage('Introduce un email válido (ej: usuario@correo.com)')
    .normalizeEmail(),

  body('password')
    .notEmpty()      .withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 })
                     .withMessage('La contraseña debe tener al menos 8 caracteres')
    .isLength({ max: 72 })
                     .withMessage('La contraseña no puede superar 72 caracteres')
    .matches(/[a-zA-Z]/).withMessage('La contraseña debe contener al menos una letra')
    .matches(/[0-9]/) .withMessage('La contraseña debe contener al menos un número'),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
                     .withMessage('El país debe ser un código de 2 letras (ej: ES, US)')
    .isAlpha()       .withMessage('El código de país solo debe contener letras')
    .toUpperCase(),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()      .withMessage('El email es obligatorio')
    .isEmail()       .withMessage('Introduce un email válido')
    .normalizeEmail(),

  body('password')
    .notEmpty()      .withMessage('La contraseña es obligatoria')
    .isLength({ max: 200 })
                     .withMessage('Contraseña demasiado larga'),
];

const changePasswordRules = [
  body('currentPassword')
    .notEmpty()      .withMessage('La contraseña actual es obligatoria'),

  body('newPassword')
    .notEmpty()      .withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 8 })
                     .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .isLength({ max: 72 })
                     .withMessage('La nueva contraseña no puede superar 72 caracteres')
    .matches(/[a-zA-Z]/).withMessage('La nueva contraseña debe contener al menos una letra')
    .matches(/[0-9]/) .withMessage('La nueva contraseña debe contener al menos un número')
    .custom((val, { req }) => {
      if (val === req.body.currentPassword)
        throw new Error('La nueva contraseña debe ser distinta a la actual');
      return true;
    }),
];

// ── Rutas ──────────────────────────────────────────────────────────────────────

router.post('/register',        registerLimiter, registerRules,       validate, ctrl.register);
router.post('/login',           loginLimiter,    loginRules,          validate, ctrl.login);
router.get ('/me',              protect,                                         ctrl.me);
router.put ('/me',              protect,                                         ctrl.updateMe);
router.put ('/change-password', protect,         changePasswordRules, validate, ctrl.changePassword);

// Admin-only
router.get   ('/users',          protect, adminOnly, ctrl.listUsers);
router.put   ('/users/:id',      protect, adminOnly, ctrl.updateUserStatus);
router.put   ('/users/:id/role', protect, adminOnly, ctrl.updateUserRole);
router.delete('/users/:id',      protect, adminOnly, ctrl.deleteUser);

module.exports = router;
