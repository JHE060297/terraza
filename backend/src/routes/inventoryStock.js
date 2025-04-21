const express = require('express');
const { body } = require('express-validator');
const {
    getAllInventory,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory,
    adjustStock
} = require('../controllers/inventoryStockController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/inventory/inventario
 * @desc Obtener todo el inventario
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/inventario', isAuthenticated, isAdminOrCashierOrWaiter, getAllInventory);

/**
 * @route GET /api/inventory/inventario/:id
 * @desc Obtener un inventario por ID
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/inventario/:id', isAuthenticated, isAdminOrCashierOrWaiter, getInventoryById);

/**
 * @route POST /api/inventory/inventario
 * @desc Crear un nuevo inventario
 * @access Private (Solo Admin)
 */
router.post('/inventario', [
    isAuthenticated,
    isAdmin,
    body('id_producto')
        .notEmpty().withMessage('El producto es requerido')
        .isInt().withMessage('El producto debe ser un número entero'),
    body('id_sucursal')
        .notEmpty().withMessage('La sucursal es requerida')
        .isInt().withMessage('La sucursal debe ser un número entero'),
    body('cantidad')
        .notEmpty().withMessage('La cantidad es requerida')
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero no negativo'),
    body('alerta')
        .notEmpty().withMessage('La alerta es requerida')
        .isInt({ min: 0 }).withMessage('La alerta debe ser un número entero no negativo')
], createInventory);

/**
 * @route PUT /api/inventory/inventario/:id
 * @desc Actualizar un inventario
 * @access Private (Solo Admin)
 */
router.put('/inventario/:id', [
    isAuthenticated,
    isAdmin,
    body('cantidad')
        .optional()
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero no negativo'),
    body('alerta')
        .optional()
        .isInt({ min: 0 }).withMessage('La alerta debe ser un número entero no negativo')
], updateInventory);

/**
 * @route DELETE /api/inventory/inventario/:id
 * @desc Eliminar un inventario
 * @access Private (Solo Admin)
 */
router.delete('/inventario/:id', isAuthenticated, isAdmin, deleteInventory);

/**
 * @route POST /api/inventory/inventario/:id/adjust_stock
 * @desc Ajustar stock (aumentar o disminuir)
 * @access Private (Admin, Cajero)
 */
router.post('/inventario/:id/adjust_stock', [
    isAuthenticated,
    isAdminOrCashier,
    // Validación para el ID del parámetro
    (req, res, next) => {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID de inventario inválido' });
        }
        next();
    },
    body('cantidad')
        .notEmpty().withMessage('La cantidad es requerida')
        .isInt().withMessage('La cantidad debe ser un número entero'),
    body('tipo_transaccion')
        .optional()
        .isIn(['compra', 'venta']).withMessage('Tipo de transacción no válido')
], adjustStock);

module.exports = router;