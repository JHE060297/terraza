const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todos los pagos
 */
const getAllPayments = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_pedido) {
            filters.id_pedido = parseInt(req.query.id_pedido);
        }

        if (req.query.id_usuario) {
            filters.id_usuario = parseInt(req.query.id_usuario);
        }

        if (req.query.metodo_pago) {
            filters.metodo_pago = req.query.metodo_pago;
        }

        // Búsqueda por texto
        let whereClause = { ...filters };
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                OR: [
                    { referencia_pago: { contains: search } }
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
                'fecha_hora': 'fecha_hora',
                'monto': 'monto'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.fecha_hora = 'desc';
        }

        // Obtener pagos con filtros y ordenamiento
        const pagos = await prisma.pago.findMany({
            where: whereClause,
            orderBy,
            include: {
                pedido: {
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
                                        nombre_producto: true
                                    }
                                }
                            }
                        }
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
        const transformedPagos = pagos.map(pago => ({
            id_pago: pago.id_pago,
            id_pedido: pago.id_pedido,
            pedido_detalle: {
                id_pedido: pago.pedido.id_pedido,
                id_mesa: pago.pedido.id_mesa,
                mesa_numero: pago.pedido.mesa.numero,
                sucursal_nombre: pago.pedido.mesa.sucursal.nombre_sucursal,
                estado: pago.pedido.estado,
                total: pago.pedido.total,
                detalles: pago.pedido.detalles.map(detalle => ({
                    id_detalle_pedido: detalle.id_detalle_pedido,
                    id_producto: detalle.id_producto,
                    producto_nombre: detalle.producto.nombre_producto,
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
                }))
            },
            id_usuario: pago.id_usuario,
            nombre_cajero: `${pago.usuario.nombre} ${pago.usuario.apellido}`,
            monto: pago.monto,
            metodo_pago: pago.metodo_pago,
            fecha_hora: pago.fecha_hora,
            referencia_pago: pago.referencia_pago || ''
        }));

        res.json(transformedPagos);
    } catch (error) {
        console.error('Error en getAllPayments:', error);
        res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
    }
};

/**
 * Obtener un pago por ID
 */
const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        const pago = await prisma.pago.findUnique({
            where: { id_pago: parseInt(id) },
            include: {
                pedido: {
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
                                        nombre_producto: true
                                    }
                                }
                            }
                        }
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

        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado' });
        }

        // Transformar los datos para la respuesta
        const transformedPago = {
            id_pago: pago.id_pago,
            id_pedido: pago.id_pedido,
            pedido_detalle: {
                id_pedido: pago.pedido.id_pedido,
                id_mesa: pago.pedido.id_mesa,
                mesa_numero: pago.pedido.mesa.numero,
                sucursal_nombre: pago.pedido.mesa.sucursal.nombre_sucursal,
                estado: pago.pedido.estado,
                total: pago.pedido.total,
                detalles: pago.pedido.detalles.map(detalle => ({
                    id_detalle_pedido: detalle.id_detalle_pedido,
                    id_producto: detalle.id_producto,
                    producto_nombre: detalle.producto.nombre_producto,
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
                }))
            },
            id_usuario: pago.id_usuario,
            nombre_cajero: `${pago.usuario.nombre} ${pago.usuario.apellido}`,
            monto: pago.monto,
            metodo_pago: pago.metodo_pago,
            fecha_hora: pago.fecha_hora,
            referencia_pago: pago.referencia_pago || ''
        };

        res.json(transformedPago);
    } catch (error) {
        console.error('Error en getPaymentById:', error);
        res.status(500).json({ message: 'Error al obtener pago', error: error.message });
    }
};

/**
 * Crear un nuevo pago
 */
const createPayment = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_pedido, monto, metodo_pago, referencia_pago } = req.body;
        const id_usuario = req.user.user_id;

        // Verificar si el pedido existe
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: parseInt(id_pedido) }
        });

        if (!pedido) {
            return res.status(400).json({ message: 'El pedido no existe' });
        }

        // Verificar que el pedido no esté ya pagado
        if (pedido.estado === 'pagado') {
            return res.status(400).json({ message: 'Este pedido ya ha sido pagado' });
        }

        // Verificar que el monto coincida con el total del pedido
        if (parseFloat(monto) !== parseFloat(pedido.total)) {
            return res.status(400).json({
                message: `El monto del pago (${monto}) no coincide con el total del pedido (${pedido.total})`
            });
        }

        // Verificar que el método de pago sea válido
        const metodosValidos = ['efectivo', 'tarjeta', 'nequi', 'daviplata'];
        if (!metodosValidos.includes(metodo_pago)) {
            return res.status(400).json({ message: 'Método de pago no válido' });
        }

        // Crear el pago y actualizar el estado del pedido en una transacción
        const result = await prisma.$transaction(async (prisma) => {
            // Crear el pago
            const newPago = await prisma.pago.create({
                data: {
                    id_pedido: parseInt(id_pedido),
                    id_usuario: parseInt(id_usuario),
                    monto: parseFloat(monto),
                    metodo_pago,
                    referencia_pago
                }
            });

            // Actualizar el estado del pedido
            await prisma.pedido.update({
                where: { id_pedido: parseInt(id_pedido) },
                data: { estado: 'pagado' }
            });

            return newPago;
        });

        // Obtener el pago completo con datos relacionados
        const pagoCompleto = await prisma.pago.findUnique({
            where: { id_pago: result.id_pago },
            include: {
                pedido: {
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
                                        nombre_producto: true
                                    }
                                }
                            }
                        }
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

        // Transformar los datos para la respuesta
        const transformedPago = {
            id_pago: pagoCompleto.id_pago,
            id_pedido: pagoCompleto.id_pedido,
            pedido_detalle: {
                id_pedido: pagoCompleto.pedido.id_pedido,
                id_mesa: pagoCompleto.pedido.id_mesa,
                mesa_numero: pagoCompleto.pedido.mesa.numero,
                sucursal_nombre: pagoCompleto.pedido.mesa.sucursal.nombre_sucursal,
                estado: pagoCompleto.pedido.estado,
                total: pagoCompleto.pedido.total,
                detalles: pagoCompleto.pedido.detalles.map(detalle => ({
                    id_detalle_pedido: detalle.id_detalle_pedido,
                    id_producto: detalle.id_producto,
                    producto_nombre: detalle.producto.nombre_producto,
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
                }))
            },
            id_usuario: pagoCompleto.id_usuario,
            nombre_cajero: `${pagoCompleto.usuario.nombre} ${pagoCompleto.usuario.apellido}`,
            monto: pagoCompleto.monto,
            metodo_pago: pagoCompleto.metodo_pago,
            fecha_hora: pagoCompleto.fecha_hora,
            referencia_pago: pagoCompleto.referencia_pago || ''
        };

        res.status(201).json(transformedPago);
    } catch (error) {
        console.error('Error en createPayment:', error);
        res.status(500).json({ message: 'Error al crear pago', error: error.message });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment
};