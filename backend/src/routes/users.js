const express = require('express');
const { body } = require('express-validator');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changeRole,
    changeBranch
} = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/users
 * @desc Obtener todos los usuarios
 * @access Private (Solo Admin)
 */
router.get('/', isAuthenticated, isAdmin, getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Obtener un usuario por ID
 * @access Private (Solo Admin)
 */
router.get('/:id', isAuthenticated, isAdmin, getUserById);

/**
 * @route POST /api/users
 * @desc Crear un nuevo usuario
 * @access Private (Solo Admin)
 */
router.post('/', [
    isAuthenticated,
    isAdmin,
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    body('id_rol').notEmpty().withMessage('El rol es requerido').isInt().withMessage('El rol debe ser un número entero'),
    body('id_sucursal').notEmpty().withMessage('La sucursal es requerida').isInt().withMessage('La sucursal debe ser un número entero')
], createUser);

/**
 * @route PUT /api/users/:id
 * @desc Actualizar un usuario
 * @access Private (Solo Admin)
 */
router.put('/:id', [
    isAuthenticated,
    isAdmin,
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('apellido').optional().notEmpty().withMessage('El apellido no puede estar vacío'),
    body('usuario').optional().notEmpty().withMessage('El nombre de usuario no puede estar vacío'),
    body('id_rol').optional().isInt().withMessage('El rol debe ser un número entero'),
    body('id_sucursal').optional().isInt().withMessage('La sucursal debe ser un número entero')
], updateUser);

/**
 * @route DELETE /api/users/:id
 * @desc Eliminar un usuario
 * @access Private (Solo Admin)
 */
router.delete('/:id', isAuthenticated, isAdmin, deleteUser);

/**
 * @route POST /api/users/:id/change_role
 * @desc Cambiar el rol de un usuario
 * @access Private (Solo Admin)
 */
router.post('/:id/change_role', [
    isAuthenticated,
    isAdmin,
    body('id_rol').notEmpty().withMessage('El rol es requerido').isInt().withMessage('El rol debe ser un número entero')
], changeRole);

/**
 * @route POST /api/users/:id/change_branch
 * @desc Cambiar la sucursal de un usuario
 * @access Private (Solo Admin)
 */
router.post('/:id/change_branch', [
    isAuthenticated,
    isAdmin,
    body('id_sucursal').notEmpty().withMessage('La sucursal es requerida').isInt().withMessage('La sucursal debe ser un número entero')
], changeBranch);

module.exports = router;