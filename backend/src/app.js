require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const inventoryRoutes = require('./routes/inventory');
const sucursalesRoutes = require('./routes/sucursales');
const ordersRoutes = require('./routes/ordersIndex');
const reportsRoutes = require('./routes/reports');
// Importaremos más rutas a medida que las vayamos creando

// Inicialización
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/media', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.use('/api/token', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', reportsRoutes);
// Agregaremos más rutas a medida que las vayamos creando

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de gestión de restaurante funcionando correctamente' });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Ha ocurrido un error en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Manejo de errores de Prisma
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
});

// Manejar el cierre adecuado de la conexión con la base de datos
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;