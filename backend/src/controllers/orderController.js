const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todos los pedidos
 */
const getAllOrders = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_mesa) {
            filters.id_mesa = parseInt(req.query.id_mesa);
        }

        if (req.query.estado) {
            filters.estado = req.query.estado;
        }

        if (req.query.id_mesa__id_sucursal) {
            filters.mesa = {
                id_sucursal: parseInt(req.query.id_mesa__id_sucursal)
            };
        }

        // Búsqueda por texto (número de mesa)
        let whereClause = { ...filters };
        if (req.query.search && !isNaN(parseInt(req.query.search))) {
            whereClause = {
                ...whereClause,
                mesa: {
                    ...whereClause.mesa,
                    numero: parseInt(req.query.search)
                }
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
                'fecha_de_creacion': 'fecha_de_creacion',
                'total': 'total'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.fecha_de_creacion = 'desc';
        }

        // Obtener pedidos con filtros y ordenamiento
        const pedidos = await prisma.pedido.findMany({
            where: whereClause,
            orderBy,
            include: {
                mesa: {
                    select: {
                        numero: true,
                        sucursal: {
                            select: {
                                nombre_sucursal: true
                            }
                        }
                    }
                },
                detalles: {
                    include: {
                        producto: {
                            select: {
                                nombre_producto: true,
                                precio_venta: true
                            }
                        }
                    }
                }
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedPedidos = pedidos.map(pedido => ({
            id_pedido: pedido.id_pedido,
            id_mesa: pedido.id_mesa,
            mesa_numero: pedido.mesa.numero,
            sucursal_nombre: pedido.mesa.sucursal.nombre_sucursal,
            estado: pedido.estado,
            total: pedido.total,
            detalles: pedido.detalles.map(detalle => ({
                id_detalle_pedido: detalle.id_detalle_pedido,
                id_pedido: detalle.id_pedido,
                id_producto: detalle.id_producto,
                producto_nombre: detalle.producto.nombre_producto,
                producto_precio: detalle.producto.precio_venta,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
            })),
            created_at: pedido.fecha_de_creacion,
            updated_at: pedido.actualizado_a
        }));

        res.json(transformedPedidos);
    } catch (error) {
        console.error('Error en getAllOrders:', error);
        res.status(500).json({ message: 'Error al obtener pedidos', error: error.message });
    }
};

/**
 * Obtener un pedido por ID
 */
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: parseInt(id) },
            include: {
                mesa: {
                    select: {
                        numero: true,
                        sucursal: {
                            select: {
                                nombre_sucursal: true
                            }
                        }
                    }
                },
                detalles: {
                    include: {
                        producto: {
                            select: {
                                nombre_producto: true,
                                precio_venta: true
                            }
                        }
                    }
                }
            }
        });

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        // Transformar los datos para la respuesta
        const transformedPedido = {
            id_pedido: pedido.id_pedido,
            id_mesa: pedido.id_mesa,
            mesa_numero: pedido.mesa.numero,
            sucursal_nombre: pedido.mesa.sucursal.nombre_sucursal,
            estado: pedido.estado,
            total: pedido.total,
            detalles: pedido.detalles.map(detalle => ({
                id_detalle_pedido: detalle.id_detalle_pedido,
                id_pedido: detalle.id_pedido,
                id_producto: detalle.id_producto,
                producto_nombre: detalle.producto.nombre_producto,
                producto_precio: detalle.producto.precio_venta,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
            })),
            created_at: pedido.fecha_de_creacion,
            updated_at: pedido.actualizado_a
        };

        res.json(transformedPedido);
    } catch (error) {
        console.error('Error en getOrderById:', error);
        res.status(500).json({ message: 'Error al obtener pedido', error: error.message });
    }
};

/**
 * Crear un nuevo pedido
 */
const createOrder = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_mesa } = req.body;

        // Verificar si la mesa existe
        const mesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id_mesa) }
        });

        if (!mesa) {
            return res.status(400).json({ error: 'La mesa seleccionada no existe' });
        }

        // Verificar que la mesa esté disponible
        if (mesa.estado !== 'libre') {
            return res.status(400).json({ error: 'La mesa seleccionada no está disponible' });
        }

        // Iniciar una transacción
        const result = await prisma.$transaction(async (prisma) => {
            // Crear el pedido
            const newPedido = await prisma.pedido.create({
                data: {
                    id_mesa: parseInt(id_mesa),
                    estado: 'pendiente',
                    total: 0
                }
            });

            // Crear la relación con el mesero (usuario actual)
            await prisma.pedidoMesero.create({
                data: {
                    id_pedido: newPedido.id_pedido,
                    id_mesero: req.user.user_id
                }
            });

            // Actualizar el estado de la mesa
            await prisma.mesa.update({
                where: { id_mesa: parseInt(id_mesa) },
                data: { estado: 'ocupada' }
            });

            return newPedido;
        });

        // Obtener el pedido con datos relacionados
        const pedidoCompleto = await prisma.pedido.findUnique({
            where: { id_pedido: result.id_pedido },
            include: {
                mesa: {
                    select: {
                        numero: true,
                        sucursal: {
                            select: {
                                nombre_sucursal: true
                            }
                        }
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedPedido = {
            id_pedido: pedidoCompleto.id_pedido,
            id_mesa: pedidoCompleto.id_mesa,
            mesa_numero: pedidoCompleto.mesa.numero,
            sucursal_nombre: pedidoCompleto.mesa.sucursal.nombre_sucursal,
            estado: pedidoCompleto.estado,
            total: pedidoCompleto.total,
            detalles: [],
            created_at: pedidoCompleto.fecha_de_creacion,
            updated_at: pedidoCompleto.actualizado_a
        };

        res.status(201).json(transformedPedido);
    } catch (error) {
        console.error('Error en createOrder:', error);
        res.status(500).json({ message: 'Error al crear pedido', error: error.message });
    }
};

/**
 * Cambiar el estado de un pedido
 */
const changeOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ error: 'Estado no proporcionado' });
        }

        // Verificar si el pedido existe
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: parseInt(id) }
        });

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        // Validar el estado
        const estadosValidos = ['pendiente', 'entregado', 'pagado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        // Validar las transiciones de estado
        if (pedido.estado === 'pagado' && estado !== 'pagado') {
            return res.status(400).json({ error: 'No se puede cambiar el estado de un pedido pagado' });
        }

        // Actualizar el estado del pedido
        await prisma.pedido.update({
            where: { id_pedido: parseInt(id) },
            data: { estado }
        });

        res.json({ status: 'Estado actualizado exitosamente' });
    } catch (error) {
        console.error('Error en changeOrderStatus:', error);
        res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    changeOrderStatus
};