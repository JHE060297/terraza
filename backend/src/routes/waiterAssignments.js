const express = require('express');
const { body } = require('express-validator');
const {
    getAllAssignments,
    createAssignment,
    deleteAssignment
} = require('../controllers/waiterAssignmentController');
const {
    isAuthenticated,
    isAdmin
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/orders/asignaciones
 * @desc Obtener todas las asignaciones de meseros a pedidos
 * @access Private (Admin)
 */
router.get('/asignaciones', isAuthenticated, isAdmin, getAllAssignments);

/**
 * @route POST /api/orders/asignaciones
 * @desc Crear una nueva asignación de mesero a pedido
 * @access Private (Admin)
 */
router.post('/asignaciones', [
    isAuthenticated,
    isAdmin,
    body('id_pedido')
        .notEmpty().withMessage('El pedido es requerido')
        .isInt().withMessage('El pedido debe ser un número entero'),
    body('id_mesero')
        .notEmpty().withMessage('El mesero es requerido')
        .isInt().withMessage('El mesero debe ser un número entero')
], createAssignment);

/**
 * @route DELETE /api/orders/asignaciones/:id
 * @desc Eliminar una asignación de mesero a pedido
 * @access Private (Admin)
 */
router.delete('/asignaciones/:id', isAuthenticated, isAdmin, deleteAssignment);

module.exports = router;