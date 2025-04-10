const express = require('express');
const { getAllRoles, getRoleById } = require('../controllers/roleController');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/roles
 * @desc Obtener todos los roles
 * @access Private (Usuarios autenticados)
 */
router.get('/', isAuthenticated, getAllRoles);

/**
 * @route GET /api/roles/:id
 * @desc Obtener un rol por ID
 * @access Private (Usuarios autenticados)
 */
router.get('/:id', isAuthenticated, getRoleById);

module.exports = router;