const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todo el inventario
 */
const getAllInventory = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_sucursal) {
            filters.id_sucursal = parseInt(req.query.id_sucursal);
        }

        if (req.query.id_producto) {
            filters.id_producto = parseInt(req.query.id_producto);
        }

        // Búsqueda por texto en nombre de producto
        let whereClause = { ...filters };
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                producto: {
                    nombre_producto: {
                        contains: search
                    }
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

            if (orderField === 'cantidad') {
                orderBy = { cantidad: orderDirection };
            }
        }

        // Obtener inventario existente
        let inventario = await prisma.inventario.findMany({
            where: whereClause,
            orderBy,
            include: {
                producto: {
                    select: {
                        nombre_producto: true,
                        is_active: true
                    }
                },
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        // Transformar inventario existente
        inventario = inventario.map(item => ({
            id_inventario: item.id_inventario,
            id_producto: item.id_producto,
            nombre_producto: item.producto.nombre_producto,
            id_sucursal: item.id_sucursal,
            nombre_sucursal: item.sucursal.nombre_sucursal,
            cantidad: item.cantidad,
            alerta: item.alerta,
            is_low_stock: item.cantidad <= item.alerta
        }));

        // Si hay filtros específicos de producto o sucursal, crear registros faltantes
        if (req.query.id_sucursal || req.query.id_producto) {
            await ensureInventoryRecords(parseInt(req.query.id_sucursal), parseInt(req.query.id_producto));

            // Volver a obtener los datos después de crear los registros faltantes
            inventario = await prisma.inventario.findMany({
                where: whereClause,
                orderBy,
                include: {
                    producto: {
                        select: {
                            nombre_producto: true,
                            is_active: true
                        }
                    },
                    sucursal: {
                        select: {
                            nombre_sucursal: true
                        }
                    }
                }
            });

            inventario = inventario.map(item => ({
                id_inventario: item.id_inventario,
                id_producto: item.id_producto,
                nombre_producto: item.producto.nombre_producto,
                id_sucursal: item.id_sucursal,
                nombre_sucursal: item.sucursal.nombre_sucursal,
                cantidad: item.cantidad,
                alerta: item.alerta,
                is_low_stock: item.cantidad <= item.alerta
            }));
        }

        // Filtrar por low stock si se solicita
        const is_low_stock = req.query.is_low_stock;
        if (is_low_stock && (is_low_stock === 'true' || is_low_stock === '1' || is_low_stock === 'yes')) {
            inventario = inventario.filter(item => item.is_low_stock);
        }

        res.json(inventario);
    } catch (error) {
        console.error('Error en getAllInventory:', error);
        res.status(500).json({ message: 'Error al obtener inventario', error: error.message });
    }
};

/**
 * Función auxiliar para asegurar que existen registros de inventario
 */
const ensureInventoryRecords = async (sucursalId, productoId) => {
    try {
        if (sucursalId && productoId) {
            // Caso específico: verificar un producto en una sucursal
            const existingRecord = await prisma.inventario.findFirst({
                where: {
                    id_producto: productoId,
                    id_sucursal: sucursalId
                }
            });

            if (!existingRecord) {
                await prisma.inventario.create({
                    data: {
                        id_producto: productoId,
                        id_sucursal: sucursalId,
                        cantidad: 0,
                        alerta: 2
                    }
                });
            }
        } else if (sucursalId) {
            // Crear registros para todos los productos activos en una sucursal
            const productos = await prisma.producto.findMany({
                where: { is_active: true }
            });

            for (const producto of productos) {
                const existingRecord = await prisma.inventario.findFirst({
                    where: {
                        id_producto: producto.id_producto,
                        id_sucursal: sucursalId
                    }
                });

                if (!existingRecord) {
                    await prisma.inventario.create({
                        data: {
                            id_producto: producto.id_producto,
                            id_sucursal: sucursalId,
                            cantidad: 0,
                            alerta: 2
                        }
                    });
                }
            }
        } else if (productoId) {
            // Crear registros para un producto en todas las sucursales
            const sucursales = await prisma.sucursal.findMany();

            for (const sucursal of sucursales) {
                const existingRecord = await prisma.inventario.findFirst({
                    where: {
                        id_producto: productoId,
                        id_sucursal: sucursal.id_sucursal
                    }
                });

                if (!existingRecord) {
                    await prisma.inventario.create({
                        data: {
                            id_producto: productoId,
                            id_sucursal: sucursal.id_sucursal,
                            cantidad: 0,
                            alerta: 2
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error en ensureInventoryRecords:', error);
        throw error;
    }
};

/**
 * Obtener un inventario por ID
 */
const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const inventario = await prisma.inventario.findUnique({
            where: { id_inventario: parseInt(id) },
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
                }
            }
        });

        if (!inventario) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        // Transformar los datos para la respuesta
        const transformedInventario = {
            id_inventario: inventario.id_inventario,
            id_producto: inventario.id_producto,
            nombre_producto: inventario.producto.nombre_producto,
            id_sucursal: inventario.id_sucursal,
            nombre_sucursal: inventario.sucursal.nombre_sucursal,
            cantidad: inventario.cantidad,
            alerta: inventario.alerta,
            is_low_stock: inventario.cantidad < inventario.alerta
        };

        res.json(transformedInventario);
    } catch (error) {
        console.error('Error en getInventoryById:', error);
        res.status(500).json({ message: 'Error al obtener inventario', error: error.message });
    }
};

/**
 * Crear un nuevo registro de inventario
 */
const createInventory = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_producto, id_sucursal, cantidad, alerta } = req.body;

        // Verificar si el producto existe
        const productoExists = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id_producto) }
        });

        if (!productoExists) {
            return res.status(400).json({ message: 'El producto no existe' });
        }

        // Verificar si la sucursal existe
        const sucursalExists = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursalExists) {
            return res.status(400).json({ message: 'La sucursal no existe' });
        }

        // Verificar si ya existe un registro para este producto en esta sucursal
        const existingInventario = await prisma.inventario.findFirst({
            where: {
                id_producto: parseInt(id_producto),
                id_sucursal: parseInt(id_sucursal)
            }
        });

        if (existingInventario) {
            return res.status(400).json({ message: 'Ya existe un registro para este producto en esta sucursal' });
        }

        // Crear el registro de inventario
        const newInventario = await prisma.inventario.create({
            data: {
                id_producto: parseInt(id_producto),
                id_sucursal: parseInt(id_sucursal),
                cantidad: parseInt(cantidad),
                alerta: parseInt(alerta)
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
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedInventario = {
            id_inventario: newInventario.id_inventario,
            id_producto: newInventario.id_producto,
            nombre_producto: newInventario.producto.nombre_producto,
            id_sucursal: newInventario.id_sucursal,
            nombre_sucursal: newInventario.sucursal.nombre_sucursal,
            cantidad: newInventario.cantidad,
            alerta: newInventario.alerta,
            is_low_stock: newInventario.cantidad <= newInventario.alerta
        };

        res.status(201).json(transformedInventario);
    } catch (error) {
        console.error('Error en createInventory:', error);
        res.status(500).json({ message: 'Error al crear inventario', error: error.message });
    }
};

/**
 * Actualizar un registro de inventario
 */
const updateInventory = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { cantidad, alerta } = req.body;

        // Verificar si el inventario existe
        const existingInventario = await prisma.inventario.findUnique({
            where: { id_inventario: parseInt(id) }
        });

        if (!existingInventario) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        // Preparar los datos para actualizar
        const updateData = {};

        if (cantidad !== undefined) updateData.cantidad = parseInt(cantidad);
        if (alerta !== undefined) updateData.alerta = parseInt(alerta);

        // Actualizar el inventario
        const updatedInventario = await prisma.inventario.update({
            where: { id_inventario: parseInt(id) },
            data: updateData,
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
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedInventario = {
            id_inventario: updatedInventario.id_inventario,
            id_producto: updatedInventario.id_producto,
            nombre_producto: updatedInventario.producto.nombre_producto,
            id_sucursal: updatedInventario.id_sucursal,
            nombre_sucursal: updatedInventario.sucursal.nombre_sucursal,
            cantidad: updatedInventario.cantidad,
            alerta: updatedInventario.alerta,
            is_low_stock: updatedInventario.cantidad <= updatedInventario.alerta
        };

        res.json(transformedInventario);
    } catch (error) {
        console.error('Error en updateInventory:', error);
        res.status(500).json({ message: 'Error al actualizar inventario', error: error.message });
    }
};

/**
 * Eliminar un registro de inventario
 */
const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el inventario existe
        const existingInventario = await prisma.inventario.findUnique({
            where: { id_inventario: parseInt(id) }
        });

        if (!existingInventario) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        // Eliminar el inventario
        await prisma.inventario.delete({
            where: { id_inventario: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteInventory:', error);
        res.status(500).json({ message: 'Error al eliminar inventario', error: error.message });
    }
};

/**
 * Ajustar stock (aumentar o disminuir la cantidad)
 */
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, tipo_transaccion = 'ajuste' } = req.body;

        // Validar que el ID es un número válido
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID de inventario inválido' });
        }

        if (cantidad === undefined) {
            return res.status(400).json({ error: 'La cantidad es obligatoria' });
        }

        const cantidadInt = parseInt(cantidad);
        if (isNaN(cantidadInt)) {
            return res.status(400).json({ error: 'La cantidad debe ser un número entero' });
        }

        // Verificar si el inventario existe
        const inventario = await prisma.inventario.findUnique({
            where: { id_inventario: parseInt(id) },
            include: {
                producto: true,
                sucursal: true
            }
        });

        if (!inventario) {
            return res.status(404).json({ message: 'Inventario no encontrado' });
        }

        // Iniciar una transacción para garantizar consistencia
        const result = await prisma.$transaction(async (prisma) => {
            // Crear la transacción de inventario
            const transaccion = await prisma.transaccionInventario.create({
                data: {
                    id_producto: inventario.id_producto,
                    id_sucursal: inventario.id_sucursal,
                    cantidad: cantidadInt,
                    tipo_transaccion,
                    id_usuario: req.user ? req.user.user_id : null
                }
            });

            // Calcular la nueva cantidad
            const nuevaCantidad = inventario.cantidad + cantidadInt;

            // Verificar que la cantidad no sea negativa
            if (nuevaCantidad < 0) {
                throw new Error('La cantidad resultante en inventario no puede ser negativa');
            }

            // Actualizar el inventario
            const updatedInventario = await prisma.inventario.update({
                where: { id_inventario: parseInt(id) },
                data: { cantidad: nuevaCantidad }
            });

            return {
                transaccion,
                inventario: updatedInventario
            };
        });

        res.json({
            status: 'Inventario actualizado exitosamente',
            nueva_cantidad: result.inventario.cantidad
        });
    } catch (error) {
        console.error('Error en adjustStock:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllInventory,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory,
    adjustStock
};