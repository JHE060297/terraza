const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todas las transacciones de inventario
 */
const getAllTransactions = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_sucursal) {
            filters.id_sucursal = parseInt(req.query.id_sucursal);
        }

        if (req.query.id_producto) {
            filters.id_producto = parseInt(req.query.id_producto);
        }

        if (req.query.tipo_transaccion) {
            filters.tipo_transaccion = req.query.tipo_transaccion;
        }

        if (req.query.id_usuario) {
            filters.id_usuario = parseInt(req.query.id_usuario);
        }

        // Búsqueda por texto
        let whereClause = { ...filters };
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                OR: [
                    {
                        producto: {
                            nombre_producto: {
                                contains: search
                            }
                        }
                    },
                    // Se podría añadir búsqueda en comentario si existiera ese campo
                ]
            };
        }

        // Determinar ordenamiento
        let orderBy = {};
        if (req.query.ordering) {
            const orderField = req.query.ordering.startsWith('-')
                ? req.query.ordering.substring(1)
                : req.query.ordering;

            const orderDirection = req.query.ordering.startsWith('-') ? 'desc' : 'asc';

            // Mapeo de campos de ordenamiento
            const fieldMapping = {
                'transaccion_fecha_hora': 'transaccion_fecha_hora',
                'cantidad': 'cantidad'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.transaccion_fecha_hora = 'desc';
        }

        // Obtener transacciones con filtros y ordenamiento
        const transacciones = await prisma.transaccionInventario.findMany({
            where: whereClause,
            orderBy,
            include: {
                producto: {
                    select: {
                        nombre_producto: true
                    }
                },
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                },
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedTransacciones = transacciones.map(transaccion => ({
            id_transaccion: transaccion.id_transaccion,
            id_producto: transaccion.id_producto,
            nombre_producto: transaccion.producto.nombre_producto,
            id_sucursal: transaccion.id_sucursal,
            nombre_sucursal: transaccion.sucursal.nombre_sucursal,
            cantidad: transaccion.cantidad,
            tipo_transaccion: transaccion.tipo_transaccion,
            transaccion_fecha_hora: transaccion.transaccion_fecha_hora,
            id_usuario: transaccion.id_usuario,
            nombre_usuario: transaccion.usuario ? `${transaccion.usuario.nombre} ${transaccion.usuario.apellido}` : null
        }));

        res.json(transformedTransacciones);
    } catch (error) {
        console.error('Error en getAllTransactions:', error);
        res.status(500).json({ message: 'Error al obtener transacciones', error: error.message });
    }
};

/**
 * Obtener una transacción por ID
 */
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const transaccion = await prisma.transaccionInventario.findUnique({
            where: { id_transaccion: parseInt(id) },
            include: {
                producto: {
                    select: {
                        nombre_producto: true
                    }
                },
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                },
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            }
        });

        if (!transaccion) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }

        // Transformar los datos para la respuesta
        const transformedTransaccion = {
            id_transaccion: transaccion.id_transaccion,
            id_producto: transaccion.id_producto,
            nombre_producto: transaccion.producto.nombre_producto,
            id_sucursal: transaccion.id_sucursal,
            nombre_sucursal: transaccion.sucursal.nombre_sucursal,
            cantidad: transaccion.cantidad,
            tipo_transaccion: transaccion.tipo_transaccion,
            transaccion_fecha_hora: transaccion.transaccion_fecha_hora,
            id_usuario: transaccion.id_usuario,
            nombre_usuario: transaccion.usuario ? `${transaccion.usuario.nombre} ${transaccion.usuario.apellido}` : null
        };

        res.json(transformedTransaccion);
    } catch (error) {
        console.error('Error en getTransactionById:', error);
        res.status(500).json({ message: 'Error al obtener transacción', error: error.message });
    }
};

/**
 * Crear una nueva transacción
 */
const createTransaction = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_producto, id_sucursal, cantidad, tipo_transaccion } = req.body;

        // Verificar si el producto existe
        const producto = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id_producto) }
        });

        if (!producto) {
            return res.status(400).json({ message: 'El producto no existe' });
        }

        // Verificar si la sucursal existe
        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursal) {
            return res.status(400).json({ message: 'La sucursal no existe' });
        }

        // Verificar el tipo de transacción
        const tiposValidos = ['compra', 'venta'];
        if (!tiposValidos.includes(tipo_transaccion)) {
            return res.status(400).json({ message: 'Tipo de transacción no válido. Solo se permite compra o venta.' });
        }

        // Buscar o crear el inventario para este producto en esta sucursal
        let inventario = await prisma.inventario.findFirst({
            where: {
                id_producto: parseInt(id_producto),
                id_sucursal: parseInt(id_sucursal)
            }
        });

        if (!inventario) {
            // Si no existe, crearlo con cantidad 0
            inventario = await prisma.inventario.create({
                data: {
                    id_producto: parseInt(id_producto),
                    id_sucursal: parseInt(id_sucursal),
                    cantidad: 0,
                    alerta: 2 // Valor por defecto
                }
            });
        }

        // Iniciar una transacción para garantizar consistencia
        const result = await prisma.$transaction(async (prisma) => {
            // Crear la transacción
            const newTransaccion = await prisma.transaccionInventario.create({
                data: {
                    id_producto: parseInt(id_producto),
                    id_sucursal: parseInt(id_sucursal),
                    cantidad: parseInt(cantidad),
                    tipo_transaccion,
                    id_usuario: req.user ? req.user.user_id : null
                },
                include: {
                    producto: {
                        select: {
                            nombre_producto: true
                        }
                    },
                    sucursal: {
                        select: {
                            nombre_sucursal: true
                        }
                    },
                    usuario: {
                        select: {
                            nombre: true,
                            apellido: true
                        }
                    }
                }
            });

            // Actualizar el inventario
            const nuevaCantidad = inventario.cantidad + parseInt(cantidad);

            // Verificar que la cantidad no sea negativa
            if (nuevaCantidad < 0) {
                throw new Error('La cantidad resultante en inventario no puede ser negativa');
            }

            const updatedInventario = await prisma.inventario.update({
                where: { id_inventario: inventario.id_inventario },
                data: { cantidad: nuevaCantidad }
            });

            return {
                transaccion: newTransaccion,
                inventario: updatedInventario
            };
        });

        // Transformar los datos para la respuesta
        const transaccion = result.transaccion;
        const transformedTransaccion = {
            id_transaccion: transaccion.id_transaccion,
            id_producto: transaccion.id_producto,
            nombre_producto: transaccion.producto.nombre_producto,
            id_sucursal: transaccion.id_sucursal,
            nombre_sucursal: transaccion.sucursal.nombre_sucursal,
            cantidad: transaccion.cantidad,
            tipo_transaccion: transaccion.tipo_transaccion,
            transaccion_fecha_hora: transaccion.transaccion_fecha_hora,
            id_usuario: transaccion.id_usuario,
            nombre_usuario: transaccion.usuario ? `${transaccion.usuario.nombre} ${transaccion.usuario.apellido}` : null
        };

        res.status(201).json(transformedTransaccion);
    } catch (error) {
        console.error('Error en createTransaction:', error);
        res.status(400).json({ message: 'Error al crear transacción', error: error.message });
    }
};

module.exports = {
    getAllTransactions,
    getTransactionById,
    createTransaction
};