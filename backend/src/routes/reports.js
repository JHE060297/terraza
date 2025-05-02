const express = require('express');
const { body } = require('express-validator');
const { generateSalesReport } = require('../controllers/reportController');
const {
    isAuthenticated,
    isAdminOrCashier
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route POST /api/reports/generate
 * @desc Generar un reporte de ventas
 * @access Private (Admin, Cajero)
 */
router.post('/generate', [
    isAuthenticated,
    isAdminOrCashier,
    body('fecha_inicio')
        .notEmpty().withMessage('La fecha de inicio es requerida')
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida'),
    body('fecha_fin')
        .notEmpty().withMessage('La fecha de fin es requerida')
        .isISO8601().withMessage('La fecha de fin debe ser una fecha válida'),
    body('formato')
        .optional()
        .isIn(['xlsx', 'csv', 'json']).withMessage('Formato no válido')
], generateSalesReport);

module.exports = router;