const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todos los detalles de pedido
 */
const getAllOrderDetails = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_pedido) {
            filters.id_pedido = parseInt(req.query.id_pedido);
        }

        if (req.query.id_producto) {
            filters.id_producto = parseInt(req.query.id_producto);
        }

        // Obtener detalles con filtros
        const detalles = await prisma.detallePedido.findMany({
            where: filters,
            include: {
                producto: {
                    select: {
                        nombre_producto: true,
                        precio_venta: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedDetalles = detalles.map(detalle => ({
            id_detalle_pedido: detalle.id_detalle_pedido,
            id_pedido: detalle.id_pedido,
            id_producto: detalle.id_producto,
            producto_nombre: detalle.producto.nombre_producto,
            producto_precio: detalle.producto.precio_venta,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            subtotal: parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario)
        }));

        res.json(transformedDetalles);
    } catch (error) {
        console.error('Error en getAllOrderDetails:', error);
        res.status(500).json({ message: 'Error al obtener detalles de pedido', error: error.message });
    }
};

/**
 * Crear un nuevo detalle de pedido
 */
const createOrderDetail = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_pedido, id_producto, cantidad } = req.body;

        // Verificar que el pedido exista y no esté pagado
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: parseInt(id_pedido) }
        });

        if (!pedido) {
            return res.status(400).json({ error: 'El pedido seleccionado no existe' });
        }

        if (pedido.estado === 'pagado') {
            return res.status(400).json({ error: 'No se pueden agregar productos a un pedido pagado' });
        }

        // Verificar que el producto exista
        const producto = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id_producto) }
        });

        if (!producto) {
            return res.status(400).json({ error: 'El producto seleccionado no existe' });
        }

        // Obtener la sucursal de la mesa para verificar stock
        const mesa = await prisma.mesa.findUnique({
            where: { id_mesa: pedido.id_mesa }
        });

        // Buscar el inventario en la sucursal de la mesa
        const inventario = await prisma.inventario.findFirst({
            where: {
                id_producto: parseInt(id_producto),
                id_sucursal: mesa.id_sucursal
            }
        });

        if (!inventario || inventario.cantidad < parseInt(cantidad)) {
            return res.status(400).json({ error: 'No hay suficiente stock del producto seleccionado' });
        }

        // Crear el detalle del pedido y actualizar el total en una transacción
        const result = await prisma.$transaction(async (prisma) => {
            // Crear el detalle del pedido
            const newDetalle = await prisma.detallePedido.create({
                data: {
                    id_pedido: parseInt(id_pedido),
                    id_producto: parseInt(id_producto),
                    cantidad: parseInt(cantidad),
                    precio_unitario: producto.precio_venta
                },
                include: {
                    producto: {
                        select: {
                            nombre_producto: true,
                            precio_venta: true
                        }
                    }
                }
            });

            // Calcular el subtotal
            const subtotal = parseFloat(cantidad) * parseFloat(producto.precio_venta);

            // Actualizar el total del pedido
            const updatedPedido = await prisma.pedido.update({
                where: { id_pedido: parseInt(id_pedido) },
                data: {
                    total: {
                        increment: subtotal
                    }
                }
            });

            // Crear la transacción de inventario
            await prisma.transaccionInventario.create({
                data: {
                    id_producto: parseInt(id_producto),
                    id_sucursal: mesa.id_sucursal,
                    cantidad: -parseInt(cantidad), // Cantidad negativa porque es una venta
                    tipo_transaccion: 'venta',
                    id_usuario: req.user ? req.user.user_id : null
                }
            });

            // Actualizar el inventario
            await prisma.inventario.update({
                where: { id_inventario: inventario.id_inventario },
                data: {
                    cantidad: {
                        decrement: parseInt(cantidad)
                    }
                }
            });

            return {
                detalle: newDetalle,
                pedido: updatedPedido
            };
        });

        // Transformar los datos para la respuesta
        const transformedDetalle = {
            id_detalle_pedido: result.detalle.id_detalle_pedido,
            id_pedido: result.detalle.id_pedido,
            id_producto: result.detalle.id_producto,
            producto_nombre: result.detalle.producto.nombre_producto,
            producto_precio: result.detalle.producto.precio_venta,
            cantidad: result.detalle.cantidad,
            precio_unitario: result.detalle.precio_unitario,
            subtotal: parseFloat(result.detalle.cantidad) * parseFloat(result.detalle.precio_unitario)
        };

        res.status(201).json(transformedDetalle);
    } catch (error) {
        console.error('Error en createOrderDetail:', error);
        res.status(500).json({ message: 'Error al crear detalle de pedido', error: error.message });
    }
};

/**
 * Eliminar un detalle de pedido
 */
const deleteOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el detalle existe
        const detalle = await prisma.detallePedido.findUnique({
            where: { id_detalle_pedido: parseInt(id) },
            include: {
                pedido: {
                    include: {
                        mesa: true
                    }
                },
                producto: true
            }
        });

        if (!detalle) {
            return res.status(404).json({ message: 'Detalle de pedido no encontrado' });
        }

        // Verificar que el pedido no esté pagado
        if (detalle.pedido.estado === 'pagado') {
            return res.status(400).json({ error: 'No se pueden eliminar productos de un pedido pagado' });
        }

        // Calcular el subtotal que se va a restar
        const subtotal = parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario);

        // Eliminar el detalle y actualizar el pedido en una transacción
        await prisma.$transaction(async (prisma) => {
            // Eliminar el detalle
            await prisma.detallePedido.delete({
                where: { id_detalle_pedido: parseInt(id) }
            });

            // Actualizar el total del pedido
            await prisma.pedido.update({
                where: { id_pedido: detalle.id_pedido },
                data: {
                    total: {
                        decrement: subtotal
                    }
                }
            });

            // Devolver el inventario
            // Primero, crear la transacción de inventario
            await prisma.transaccionInventario.create({
                data: {
                    id_producto: detalle.id_producto,
                    id_sucursal: detalle.pedido.mesa.id_sucursal,
                    cantidad: detalle.cantidad, // Cantidad positiva porque se devuelve al inventario
                    tipo_transaccion: 'ajuste',
                    id_usuario: req.user ? req.user.user_id : null
                }
            });

            // Luego, actualizar el inventario
            const inventario = await prisma.inventario.findFirst({
                where: {
                    id_producto: detalle.id_producto,
                    id_sucursal: detalle.pedido.mesa.id_sucursal
                }
            });

            if (inventario) {
                await prisma.inventario.update({
                    where: { id_inventario: inventario.id_inventario },
                    data: {
                        cantidad: {
                            increment: detalle.cantidad
                        }
                    }
                });
            }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteOrderDetail:', error);
        res.status(500).json({ message: 'Error al eliminar detalle de pedido', error: error.message });
    }
};

module.exports = {
    getAllOrderDetails,
    createOrderDetail,
    deleteOrderDetail
};