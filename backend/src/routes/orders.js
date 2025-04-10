const express = require('express');
const { body } = require('express-validator');
const {
    getAllOrders,
    getOrderById,
    createOrder,
    changeOrderStatus
} = require('../controllers/orderController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/orders/pedidos
 * @desc Obtener todos los pedidos
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/pedidos', isAuthenticated, isAdminOrCashierOrWaiter, getAllOrders);

/**
 * @route GET /api/orders/pedidos/:id
 * @desc Obtener un pedido por ID
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/pedidos/:id', isAuthenticated, isAdminOrCashierOrWaiter, getOrderById);

/**
 * @route POST /api/orders/pedidos
 * @desc Crear un nuevo pedido
 * @access Private (Admin, Mesero)
 */
router.post('/pedidos', [
    isAuthenticated,
    (req, res, next) => {
        if (req.user.is_admin || req.user.rol === 'mesero') {
            return next();
        }
        return res.status(403).json({ message: 'Acceso denegado' });
    },
    body('id_mesa')
        .notEmpty().withMessage('La mesa es requerida')
        .isInt().withMessage('La mesa debe ser un número entero')
], createOrder);

/**
 * @route POST /api/orders/pedidos/:id/cambiar_estado
 * @desc Cambiar el estado de un pedido
 * @access Private (Admin)
 */
router.post('/pedidos/:id/cambiar_estado', [
    isAuthenticated,
    isAdmin,
    body('estado')
        .notEmpty().withMessage('El estado es requerido')
        .isIn(['pendiente', 'entregado', 'pagado']).withMessage('Estado no válido')
], changeOrderStatus);

module.exports = router;