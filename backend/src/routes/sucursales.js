const express = require('express');
const router = express.Router();

// Importar las rutas específicas
const branchRoutes = require('./branches');
const tableRoutes = require('./tables');

// Usar las rutas
router.use(branchRoutes);
router.use(tableRoutes);

module.exports = router;