const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Función auxiliar para obtener el texto de visualización del estado
const getEstadoDisplay = (estado) => {
    const estadoMap = {
        'libre': 'Libre',
        'ocupada': 'Ocupada',
        'pagado': 'Pagado'
    };
    return estadoMap[estado] || estado;
};

/**
 * Obtener todas las mesas
 */
const getAllTables = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_sucursal) {
            filters.id_sucursal = parseInt(req.query.id_sucursal);
        }

        if (req.query.estado) {
            filters.estado = req.query.estado;
        }

        if (req.query.is_active !== undefined) {
            filters.is_active = req.query.is_active === 'true';
        }

        // Búsqueda por texto (número de mesa)
        let whereClause = { ...filters };
        if (req.query.search) {
            const searchNum = parseInt(req.query.search);
            if (!isNaN(searchNum)) {
                whereClause = {
                    ...whereClause,
                    numero: searchNum
                };
            }
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
                'numero': 'numero',
                'estado': 'estado'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.numero = 'asc';
        }

        // Obtener mesas con filtros y ordenamiento
        const mesas = await prisma.mesa.findMany({
            where: whereClause,
            orderBy,
            include: {
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedMesas = mesas.map(mesa => ({
            id_mesa: mesa.id_mesa,
            numero: mesa.numero,
            id_sucursal: mesa.id_sucursal,
            nombre_sucursal: mesa.sucursal.nombre_sucursal,
            estado: mesa.estado,
            estado_display: getEstadoDisplay(mesa.estado),
            is_active: mesa.is_active
        }));

        res.json(transformedMesas);
    } catch (error) {
        console.error('Error en getAllTables:', error);
        res.status(500).json({ message: 'Error al obtener mesas', error: error.message });
    }
};

/**
 * Obtener una mesa por ID
 */
const getTableById = async (req, res) => {
    try {
        const { id } = req.params;

        const mesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id) },
            include: {
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        if (!mesa) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Transformar los datos para la respuesta
        const transformedMesa = {
            id_mesa: mesa.id_mesa,
            numero: mesa.numero,
            id_sucursal: mesa.id_sucursal,
            nombre_sucursal: mesa.sucursal.nombre_sucursal,
            estado: mesa.estado,
            estado_display: getEstadoDisplay(mesa.estado),
            is_active: mesa.is_active
        };

        res.json(transformedMesa);
    } catch (error) {
        console.error('Error en getTableById:', error);
        res.status(500).json({ message: 'Error al obtener mesa', error: error.message });
    }
};

/**
 * Crear una nueva mesa
 */
const createTable = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { numero, id_sucursal, estado, is_active } = req.body;

        // Verificar si la sucursal existe
        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursal) {
            return res.status(400).json({ message: 'La sucursal especificada no existe' });
        }

        // Verificar si ya existe una mesa con ese número en esa sucursal
        const existingMesa = await prisma.mesa.findFirst({
            where: {
                numero: parseInt(numero),
                id_sucursal: parseInt(id_sucursal)
            }
        });

        if (existingMesa) {
            return res.status(400).json({ message: 'Ya existe una mesa con ese número en esa sucursal' });
        }

        // Validar el estado
        const estadosValidos = ['libre', 'ocupada', 'pagado'];
        const estadoToUse = estado && estadosValidos.includes(estado) ? estado : 'libre';

        // Crear la mesa
        const newMesa = await prisma.mesa.create({
            data: {
                numero: parseInt(numero),
                id_sucursal: parseInt(id_sucursal),
                estado: estadoToUse,
                is_active: is_active !== undefined ? is_active === 'true' : true
            },
            include: {
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedMesa = {
            id_mesa: newMesa.id_mesa,
            numero: newMesa.numero,
            id_sucursal: newMesa.id_sucursal,
            nombre_sucursal: newMesa.sucursal.nombre_sucursal,
            estado: newMesa.estado,
            estado_display: getEstadoDisplay(newMesa.estado),
            is_active: newMesa.is_active
        };

        res.status(201).json(transformedMesa);
    } catch (error) {
        console.error('Error en createTable:', error);
        res.status(500).json({ message: 'Error al crear mesa', error: error.message });
    }
};

/**
 * Actualizar una mesa
 */
const updateTable = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { numero, id_sucursal, estado, is_active } = req.body;

        // Verificar si la mesa existe
        const existingMesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id) }
        });

        if (!existingMesa) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Preparar los datos para actualizar
        const updateData = {};

        // Si se actualiza el número o la sucursal, verificar que no exista otra mesa con ese número en esa sucursal
        if ((numero !== undefined && parseInt(numero) !== existingMesa.numero) ||
            (id_sucursal !== undefined && parseInt(id_sucursal) !== existingMesa.id_sucursal)) {

            const newNumero = numero !== undefined ? parseInt(numero) : existingMesa.numero;
            const newSucursalId = id_sucursal !== undefined ? parseInt(id_sucursal) : existingMesa.id_sucursal;

            // Verificar si la sucursal existe
            if (id_sucursal !== undefined) {
                const sucursal = await prisma.sucursal.findUnique({
                    where: { id_sucursal: newSucursalId }
                });

                if (!sucursal) {
                    return res.status(400).json({ message: 'La sucursal especificada no existe' });
                }
            }

            // Verificar si ya existe otra mesa con ese número en esa sucursal
            const mesaWithSameNumber = await prisma.mesa.findFirst({
                where: {
                    numero: newNumero,
                    id_sucursal: newSucursalId,
                    NOT: {
                        id_mesa: parseInt(id)
                    }
                }
            });

            if (mesaWithSameNumber) {
                return res.status(400).json({ message: 'Ya existe otra mesa con ese número en esa sucursal' });
            }
        }

        if (numero !== undefined) updateData.numero = parseInt(numero);
        if (id_sucursal !== undefined) updateData.id_sucursal = parseInt(id_sucursal);

        // Validar el estado
        if (estado !== undefined) {
            const estadosValidos = ['libre', 'ocupada', 'pagado'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({ message: 'Estado no válido' });
            }
            updateData.estado = estado;
        }

        if (is_active !== undefined) updateData.is_active = is_active === 'true';

        // Actualizar la mesa
        const updatedMesa = await prisma.mesa.update({
            where: { id_mesa: parseInt(id) },
            data: updateData,
            include: {
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedMesa = {
            id_mesa: updatedMesa.id_mesa,
            numero: updatedMesa.numero,
            id_sucursal: updatedMesa.id_sucursal,
            nombre_sucursal: updatedMesa.sucursal.nombre_sucursal,
            estado: updatedMesa.estado,
            estado_display: getEstadoDisplay(updatedMesa.estado),
            is_active: updatedMesa.is_active
        };

        res.json(transformedMesa);
    } catch (error) {
        console.error('Error en updateTable:', error);
        res.status(500).json({ message: 'Error al actualizar mesa', error: error.message });
    }
};

/**
 * Eliminar una mesa
 */
const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la mesa existe
        const existingMesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id) },
            include: {
                _count: {
                    select: {
                        pedidos: true
                    }
                }
            }
        });

        if (!existingMesa) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Verificar si la mesa tiene pedidos asociados
        if (existingMesa._count.pedidos > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la mesa porque tiene pedidos asociados'
            });
        }

        // Eliminar la mesa
        await prisma.mesa.delete({
            where: { id_mesa: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteTable:', error);
        res.status(500).json({ message: 'Error al eliminar mesa', error: error.message });
    }
};

/**
 * Cambiar el estado de una mesa
 */
const changeTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ error: 'Estado no proporcionado' });
        }

        // Verificar si la mesa existe
        const existingMesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id) }
        });

        if (!existingMesa) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Validar el estado
        const estadosValidos = ['libre', 'ocupada', 'pagado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        // Actualizar el estado de la mesa
        await prisma.mesa.update({
            where: { id_mesa: parseInt(id) },
            data: { estado }
        });

        res.json({ status: 'estado de la mesa actualizado' });
    } catch (error) {
        console.error('Error en changeTableStatus:', error);
        res.status(500).json({ message: 'Error al cambiar estado de la mesa', error: error.message });
    }
};

/**
 * Liberar una mesa (cambiar estado a 'libre')
 */
const freeTable = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la mesa existe
        const existingMesa = await prisma.mesa.findUnique({
            where: { id_mesa: parseInt(id) }
        });

        if (!existingMesa) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Actualizar el estado de la mesa a 'libre'
        await prisma.mesa.update({
            where: { id_mesa: parseInt(id) },
            data: { estado: 'libre' }
        });

        res.json({ status: 'mesa liberada exitosamente' });
    } catch (error) {
        console.error('Error en freeTable:', error);
        res.status(500).json({ message: 'Error al liberar mesa', error: error.message });
    }
};

/**
 * Obtener mesas por sucursal
 */

const getTablesByBranch = async (req, res) => {
    try {
        const { id_sucursal } = req.params;

        // Verificar si la sucursal existe
        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursal) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Obtener mesas de la sucursal
        const mesas = await prisma.mesa.findMany({
            where: { id_sucursal: parseInt(id_sucursal) },
            include: {
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        res.json(mesas);
    } catch (error) {
        console.error('Error en getTablesByBranch:', error);
        res.status(500).json({ message: 'Error al obtener mesas por sucursal', error: error.message });
    }
}

module.exports = {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    changeTableStatus,
    freeTable,
    getTablesByBranch
};