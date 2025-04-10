const express = require('express');
const { body } = require('express-validator');
const { upload } = require('../config/upload');
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive
} = require('../controllers/inventoryController');
const {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier,
    isAdminOrCashierOrWaiter
} = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /api/inventory/productos
 * @desc Obtener todos los productos
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/productos', isAuthenticated, isAdminOrCashierOrWaiter, getAllProducts);

/**
 * @route GET /api/inventory/productos/:id
 * @desc Obtener un producto por ID
 * @access Private (Admin, Cajero, Mesero)
 */
router.get('/productos/:id', isAuthenticated, isAdminOrCashierOrWaiter, getProductById);

/**
 * @route POST /api/inventory/productos
 * @desc Crear un nuevo producto
 * @access Private (Solo Admin)
 */
router.post('/productos', [
    isAuthenticated,
    isAdmin,
    upload.single('image'),
    body('nombre_producto').notEmpty().withMessage('El nombre del producto es requerido'),
    body('precio_compra')
        .notEmpty().withMessage('El precio de compra es requerido')
        .isFloat({ min: 0 }).withMessage('El precio de compra debe ser un número positivo'),
    body('precio_venta')
        .notEmpty().withMessage('El precio de venta es requerido')
        .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo')
], createProduct);

/**
 * @route PUT /api/inventory/productos/:id
 * @desc Actualizar un producto
 * @access Private (Solo Admin)
 */
router.put('/productos/:id', [
    isAuthenticated,
    isAdmin,
    upload.single('image'),
    body('nombre_producto').optional().notEmpty().withMessage('El nombre del producto no puede estar vacío'),
    body('precio_compra')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de compra debe ser un número positivo'),
    body('precio_venta')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo')
], updateProduct);

/**
 * @route DELETE /api/inventory/productos/:id
 * @desc Eliminar un producto
 * @access Private (Solo Admin)
 */
router.delete('/productos/:id', isAuthenticated, isAdmin, deleteProduct);

/**
 * @route POST /api/inventory/productos/:id/toggle_active
 * @desc Activar/desactivar un producto
 * @access Private (Solo Admin)
 */
router.post('/productos/:id/toggle_active', isAuthenticated, isAdmin, toggleProductActive);

module.exports = router;