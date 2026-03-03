const router = require('express').Router();
const ctrl   = require('../controllers/events.controller');

router.get('/rotation', ctrl.getRotation);   // público, sin auth

module.exports = router;