const express = require('express');
const { body } = require('express-validator');
const {
    getAllOrderDetails,
    createOrderDetail,
    deleteOrderDetail
} = require('../controllers/orderDetailController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/orders/detalles
 * @desc Obtener todos los detalles de pedido
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/detalles', isAuthenticated, isAdminOrCashierOrWaiter, getAllOrderDetails);

/**
 * @route POST /api/orders/detalles
 * @desc Crear un nuevo detalle de pedido
 * @access Private (Admin, Mesero)
 */
router.post('/detalles', [
    isAuthenticated,
    (req, res, next) => {
        if (req.user.is_admin || req.user.rol === 'mesero') {
            return next();
        }
        return res.status(403).json({ message: 'Acceso denegado' });
    },
    body('id_pedido')
        .notEmpty().withMessage('El pedido es requerido')
        .isInt().withMessage('El pedido debe ser un número entero'),
    body('id_producto')
        .notEmpty().withMessage('El producto es requerido')
        .isInt().withMessage('El producto debe ser un número entero'),
    body('cantidad')
        .notEmpty().withMessage('La cantidad es requerida')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero positivo')
], createOrderDetail);

/**
 * @route DELETE /api/orders/detalles/:id
 * @desc Eliminar un detalle de pedido
 * @access Private (Admin)
 */
router.delete('/detalles/:id', isAuthenticated, isAdmin, deleteOrderDetail);

module.exports = router;