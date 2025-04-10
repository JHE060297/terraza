const express = require('express');
const router = express.Router();

// Importar las rutas específicas
const orderRoutes = require('./orders');
const orderDetailRoutes = require('./orderDetails');
const waiterAssignmentRoutes = require('./waiterAssignments');
const paymentRoutes = require('./payments');

// Usar las rutas
router.use(orderRoutes);
router.use(orderDetailRoutes);
router.use(waiterAssignmentRoutes);
router.use(paymentRoutes);

module.exports = router;