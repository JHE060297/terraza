const express = require('express');
const { body } = require('express-validator');
const {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    changeTableStatus,
    freeTable,
    getTablesByBranch
} = require('../controllers/tableController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/sucursales/mesas
 * @desc Obtener todas las mesas
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/mesas', isAuthenticated, isAdminOrCashierOrWaiter, getAllTables);

/**
 * @route GET /api/sucursales/mesas/:id
 * @desc Obtener una mesa por ID
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/mesas/:id', isAuthenticated, isAdminOrCashierOrWaiter, getTableById);

/**
 * @route POST /api/sucursales/mesas
 * @desc Crear una nueva mesa
 * @access Private (Solo Admin)
 */
router.post('/mesas', [
    isAuthenticated,
    isAdmin,
    body('numero')
        .notEmpty().withMessage('El número de mesa es requerido')
        .isInt({ min: 1 }).withMessage('El número de mesa debe ser un entero positivo'),
    body('id_sucursal')
        .notEmpty().withMessage('La sucursal es requerida')
        .isInt().withMessage('La sucursal debe ser un número entero')
], createTable);

/**
 * @route PUT /api/sucursales/mesas/:id
 * @desc Actualizar una mesa
 * @access Private (Solo Admin)
 */
router.put('/mesas/:id', [
    isAuthenticated,
    isAdmin,
    body('numero')
        .optional()
        .isInt({ min: 1 }).withMessage('El número de mesa debe ser un entero positivo'),
    body('id_sucursal')
        .optional()
        .isInt().withMessage('La sucursal debe ser un número entero'),
    body('estado')
        .optional()
        .isIn(['libre', 'ocupada', 'pagado']).withMessage('Estado no válido')
], updateTable);

/**
 * @route DELETE /api/sucursales/mesas/:id
 * @desc Eliminar una mesa
 * @access Private (Solo Admin)
 */
router.delete('/mesas/:id', isAuthenticated, isAdmin, deleteTable);

/**
 * @route POST /api/sucursales/mesas/:id/cambiar_estado
 * @desc Cambiar el estado de una mesa
 * @access Private (Admin, Cajero, Mesero)
 */
router.post('/mesas/:id/cambiar_estado', [
    isAuthenticated,
    isAdminOrCashierOrWaiter,
    body('estado')
        .notEmpty().withMessage('El estado es requerido')
        .isIn(['libre', 'ocupada', 'pagado']).withMessage('Estado no válido')
], changeTableStatus);

/**
 * @route POST /api/sucursales/mesas/:id/liberar_mesa
 * @desc Liberar una mesa (cambiar estado a 'libre')
 * @access Private (Admin, Cajero)
 */
router.post('/mesas/:id/liberar_mesa', isAuthenticated, isAdminOrCashier, freeTable);

/**
 * @route GET /api/sucursales/mesas/:idSucursal
 * @desc Obtener todas las mesas de una sucursal
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/mesas/sucursal/:idSucursal', isAuthenticated, isAdminOrCashierOrWaiter, getTablesByBranch);

module.exports = router;