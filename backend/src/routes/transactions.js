const express = require('express');
const { body } = require('express-validator');
const {
    getAllTransactions,
    getTransactionById,
    createTransaction
} = require('../controllers/transactionController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/inventory/transacciones
 * @desc Obtener todas las transacciones
 * @access Private (Admin, Cajero)
 */
router.get('/transacciones', isAuthenticated, isAdminOrCashier, getAllTransactions);

/**
 * @route GET /api/inventory/transacciones/:id
 * @desc Obtener una transacción por ID
 * @access Private (Admin, Cajero)
 */
router.get('/transacciones/:id', isAuthenticated, isAdminOrCashier, getTransactionById);

/**
 * @route POST /api/inventory/transacciones
 * @desc Crear una nueva transacción
 * @access Private (Admin, Cajero)
 */
router.post('/transacciones', [
    isAuthenticated,
    isAdminOrCashier,
    body('id_producto')
        .notEmpty().withMessage('El producto es requerido')
        .isInt().withMessage('El producto debe ser un número entero'),
    body('id_sucursal')
        .notEmpty().withMessage('La sucursal es requerida')
        .isInt().withMessage('La sucursal debe ser un número entero'),
    body('cantidad')
        .notEmpty().withMessage('La cantidad es requerida')
        .isInt().withMessage('La cantidad debe ser un número entero'),
    body('tipo_transaccion')
        .notEmpty().withMessage('El tipo de transacción es requerido')
        .isIn(['compra', 'venta']).withMessage('Tipo de transacción no válido, debe ser compra o venta')
], createTransaction);

module.exports = router;