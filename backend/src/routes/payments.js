const express = require('express');
const { body } = require('express-validator');
const {
    getAllPayments,
    getPaymentById,
    createPayment
} = require('../controllers/paymentController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/orders/pagos
 * @desc Obtener todos los pagos
 * @access Private (Admin, Cajero)
 */
router.get('/pagos', isAuthenticated, isAdminOrCashier, getAllPayments);

/**
 * @route GET /api/orders/pagos/:id
 * @desc Obtener un pago por ID
 * @access Private (Admin, Cajero)
 */
router.get('/pagos/:id', isAuthenticated, isAdminOrCashier, getPaymentById);

/**
 * @route POST /api/orders/pagos
 * @desc Crear un nuevo pago
 * @access Private (Admin, Cajero)
 */
router.post('/pagos', [
    isAuthenticated,
    isAdminOrCashier,
    body('id_pedido')
        .notEmpty().withMessage('El pedido es requerido')
        .isInt().withMessage('El pedido debe ser un número entero'),
    body('monto')
        .notEmpty().withMessage('El monto es requerido')
        .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número positivo'),
    body('metodo_pago')
        .notEmpty().withMessage('El método de pago es requerido')
        .isIn(['efectivo', 'tarjeta', 'nequi', 'daviplata']).withMessage('Método de pago no válido')
], createPayment);

module.exports = router;