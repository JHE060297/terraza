const express = require('express');
const { body } = require('express-validator');
const {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/sucursales/sucursales
 * @desc Obtener todas las sucursales
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/sucursales', isAuthenticated, isAdminOrCashierOrWaiter, getAllBranches);

/**
 * @route GET /api/sucursales/sucursales/:id
 * @desc Obtener una sucursal por ID
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/sucursales/:id', isAuthenticated, isAdminOrCashierOrWaiter, getBranchById);

/**
 * @route POST /api/sucursales/sucursales
 * @desc Crear una nueva sucursal
 * @access Private (Solo Admin)
 */
router.post('/sucursales', [
    isAuthenticated,
    isAdmin,
    body('nombre_sucursal').notEmpty().withMessage('El nombre de la sucursal es requerido'),
    body('direccion').notEmpty().withMessage('La dirección es requerida'),
    body('telefono').notEmpty().withMessage('El teléfono es requerido')
], createBranch);

/**
 * @route PUT /api/sucursales/sucursales/:id
 * @desc Actualizar una sucursal
 * @access Private (Solo Admin)
 */
router.put('/sucursales/:id', [
    isAuthenticated,
    isAdmin,
    body('nombre_sucursal').optional().notEmpty().withMessage('El nombre de la sucursal no puede estar vacío'),
    body('direccion').optional().notEmpty().withMessage('La dirección no puede estar vacía'),
    body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío')
], updateBranch);

/**
 * @route DELETE /api/sucursales/sucursales/:id
 * @desc Eliminar una sucursal
 * @access Private (Solo Admin)
 */
router.delete('/sucursales/:id', isAuthenticated, isAdmin, deleteBranch);

module.exports = router;