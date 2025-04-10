const express = require('express');
const { login, refreshToken } = require('../controllers/authController');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route POST /api/token/
 * @desc Iniciar sesión y obtener tokens
 * @access Public
 */
router.post('/', [
    body('usuario').notEmpty().withMessage('El usuario es requerido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
], login);

/**
 * @route POST /api/token/refresh/
 * @desc Renovar token de acceso
 * @access Public
 */
router.post('/refresh/', [
    body('refresh').notEmpty().withMessage('El token de actualización es requerido')
], refreshToken);

module.exports = router;