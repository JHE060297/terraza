const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todas las sucursales
 */
const getAllBranches = async (req, res) => {
    try {
        // Búsqueda por texto
        let whereClause = {};
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                OR: [
                    { nombre_sucursal: { contains: search } },
                    { direccion: { contains: search } }
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

            if (orderField === 'nombre_sucursal') {
                orderBy.nombre_sucursal = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.nombre_sucursal = 'asc';
        }

        // Obtener sucursales con filtros y ordenamiento
        const sucursales = await prisma.sucursal.findMany({
            where: whereClause,
            orderBy,
            include: {
                _count: {
                    select: {
                        mesas: true
                    }
                }
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedSucursales = sucursales.map(sucursal => ({
            id_sucursal: sucursal.id_sucursal,
            nombre_sucursal: sucursal.nombre_sucursal,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
            mesas_count: sucursal._count.mesas
        }));

        res.json(transformedSucursales);
    } catch (error) {
        console.error('Error en getAllBranches:', error);
        res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
    }
};

/**
 * Obtener una sucursal por ID
 */
const getBranchById = async (req, res) => {
    try {
        const { id } = req.params;

        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id) },
            include: {
                _count: {
                    select: {
                        mesas: true
                    }
                }
            }
        });

        if (!sucursal) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Transformar los datos para la respuesta
        const transformedSucursal = {
            id_sucursal: sucursal.id_sucursal,
            nombre_sucursal: sucursal.nombre_sucursal,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
            mesas_count: sucursal._count.mesas
        };

        res.json(transformedSucursal);
    } catch (error) {
        console.error('Error en getBranchById:', error);
        res.status(500).json({ message: 'Error al obtener sucursal', error: error.message });
    }
};

/**
 * Crear una nueva sucursal
 */
const createBranch = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre_sucursal, direccion, telefono } = req.body;

        // Verificar si ya existe una sucursal con ese nombre
        const existingSucursal = await prisma.sucursal.findFirst({
            where: { nombre_sucursal }
        });

        if (existingSucursal) {
            return res.status(400).json({ message: 'Ya existe una sucursal con ese nombre' });
        }

        // Crear la sucursal
        const newSucursal = await prisma.sucursal.create({
            data: {
                nombre_sucursal,
                direccion,
                telefono
            }
        });

        // Transformar los datos para la respuesta
        const transformedSucursal = {
            id_sucursal: newSucursal.id_sucursal,
            nombre_sucursal: newSucursal.nombre_sucursal,
            direccion: newSucursal.direccion,
            telefono: newSucursal.telefono,
            mesas_count: 0
        };

        res.status(201).json(transformedSucursal);
    } catch (error) {
        console.error('Error en createBranch:', error);
        res.status(500).json({ message: 'Error al crear sucursal', error: error.message });
    }
};

/**
 * Actualizar una sucursal
 */
const updateBranch = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { nombre_sucursal, direccion, telefono } = req.body;

        // Verificar si la sucursal existe
        const existingSucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id) }
        });

        if (!existingSucursal) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Verificar si el nombre ya está en uso por otra sucursal
        if (nombre_sucursal && nombre_sucursal !== existingSucursal.nombre_sucursal) {
            const sucursalWithSameName = await prisma.sucursal.findFirst({
                where: {
                    nombre_sucursal,
                    NOT: {
                        id_sucursal: parseInt(id)
                    }
                }
            });

            if (sucursalWithSameName) {
                return res.status(400).json({ message: 'Ya existe otra sucursal con ese nombre' });
            }
        }

        // Preparar los datos para actualizar
        const updateData = {};

        if (nombre_sucursal !== undefined) updateData.nombre_sucursal = nombre_sucursal;
        if (direccion !== undefined) updateData.direccion = direccion;
        if (telefono !== undefined) updateData.telefono = telefono;

        // Actualizar la sucursal
        const updatedSucursal = await prisma.sucursal.update({
            where: { id_sucursal: parseInt(id) },
            data: updateData,
            include: {
                _count: {
                    select: {
                        mesas: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedSucursal = {
            id_sucursal: updatedSucursal.id_sucursal,
            nombre_sucursal: updatedSucursal.nombre_sucursal,
            direccion: updatedSucursal.direccion,
            telefono: updatedSucursal.telefono,
            mesas_count: updatedSucursal._count.mesas
        };

        res.json(transformedSucursal);
    } catch (error) {
        console.error('Error en updateBranch:', error);
        res.status(500).json({ message: 'Error al actualizar sucursal', error: error.message });
    }
};

/**
 * Eliminar una sucursal
 */
const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la sucursal existe
        const existingSucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id) },
            include: {
                _count: {
                    select: {
                        mesas: true,
                        usuarios: true,
                        inventarios: true,
                        transacciones: true,
                        reportes: true
                    }
                }
            }
        });

        if (!existingSucursal) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Crear un mensaje detallado de las dependencias
        const dependencies = [];
        
        if (existingSucursal._count.mesas > 0) {
            dependencies.push(`${existingSucursal._count.mesas} mesas`);
        }
        if (existingSucursal._count.usuarios > 0) {
            dependencies.push(`${existingSucursal._count.usuarios} usuarios`);
        }
        if (existingSucursal._count.inventarios > 0) {
            dependencies.push(`${existingSucursal._count.inventarios} registros de inventario`);
        }
        if (existingSucursal._count.transacciones > 0) {
            dependencies.push(`${existingSucursal._count.transacciones} transacciones`);
        }
        if (existingSucursal._count.reportes > 0) {
            dependencies.push(`${existingSucursal._count.reportes} reportes`);
        }

        if (dependencies.length > 0) {
            return res.status(400).json({
                message: `No se puede eliminar la sucursal porque tiene: ${dependencies.join(', ')}`
            });
        }

        // Eliminar la sucursal
        await prisma.sucursal.delete({
            where: { id_sucursal: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteBranch:', error);
        
        // Verificar si es un error de referencia de Prisma
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                message: 'No se puede eliminar la sucursal porque tiene registros asociados en la base de datos. Por favor, elimine primero todos los registros relacionados.'
            });
        }
        
        res.status(500).json({ message: 'Error al eliminar sucursal', error: error.message });
    }
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};