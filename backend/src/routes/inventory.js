const express = require('express');
const router = express.Router();

// Importar las rutas específicas
const productRoutes = require('./products');
const stockRoutes = require('./inventoryStock');
const transactionRoutes = require('./transactions');

// Usar las rutas
router.use(productRoutes);
router.use(stockRoutes);
router.use(transactionRoutes);

module.exports = router;