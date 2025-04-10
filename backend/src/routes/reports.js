const express = require('express');
const { body } = require('express-validator');
const {
    getAllReports,
    createReport,
    downloadReport
} = require('../controllers/reportController');
const {
    isAuthenticated,
    isAdminOrCashier
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/reports
 * @desc Obtener todos los reportes
 * @access Private (Admin, Cajero)
 */
router.get('/', isAuthenticated, isAdminOrCashier, getAllReports);

/**
 * @route POST /api/reports
 * @desc Crear un nuevo reporte
 * @access Private (Admin, Cajero)
 */
router.post('/', [
    isAuthenticated,
    isAdminOrCashier,
    body('id_sucursal')
        .notEmpty().withMessage('La sucursal es requerida')
        .isInt().withMessage('La sucursal debe ser un número entero'),
    body('fecha_inicio')
        .notEmpty().withMessage('La fecha de inicio es requerida')
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida'),
    body('fecha_fin')
        .notEmpty().withMessage('La fecha de fin es requerida')
        .isISO8601().withMessage('La fecha de fin debe ser una fecha válida'),
    body('formato')
        .notEmpty().withMessage('El formato es requerido')
        .isIn(['xlsx', 'csv', 'pdf']).withMessage('Formato no válido')
], createReport);

/**
 * @route GET /api/reports/:id/descargar
 * @desc Descargar un reporte
 * @access Private (Admin, Cajero)
 */
router.get('/:id/descargar', isAuthenticated, isAdminOrCashier, downloadReport);

module.exports = router;