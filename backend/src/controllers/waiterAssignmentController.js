const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todas las asignaciones de meseros a pedidos
 */
const getAllAssignments = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_pedido) {
            filters.id_pedido = parseInt(req.query.id_pedido);
        }

        if (req.query.id_mesero) {
            filters.id_mesero = parseInt(req.query.id_mesero);
        }

        // Obtener asignaciones con filtros
        const asignaciones = await prisma.pedidoMesero.findMany({
            where: filters,
            include: {
                pedido: {
                    select: {
                        id_pedido: true,
                        estado: true,
                        total: true,
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
                },
                mesero: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedAsignaciones = asignaciones.map(asignacion => ({
            id: asignacion.id,
            id_pedido: asignacion.id_pedido,
            id_mesero: asignacion.id_mesero,
            nombre_mesero: `${asignacion.mesero.nombre} ${asignacion.mesero.apellido}`
        }));

        res.json(transformedAsignaciones);
    } catch (error) {
        console.error('Error en getAllAssignments:', error);
        res.status(500).json({ message: 'Error al obtener asignaciones', error: error.message });
    }
};

/**
 * Crear una nueva asignación de mesero a pedido
 */
const createAssignment = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_pedido, id_mesero } = req.body;

        // Verificar si el pedido existe
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: parseInt(id_pedido) }
        });

        if (!pedido) {
            return res.status(400).json({ error: 'El pedido no existe' });
        }

        // Verificar si el mesero existe y tiene rol de mesero
        const mesero = await prisma.usuario.findFirst({
            where: {
                id_usuario: parseInt(id_mesero),
                rol: {
                    nombre: 'mesero'
                }
            }
        });

        if (!mesero) {
            return res.status(400).json({ error: 'El usuario no existe o no es mesero' });
        }

        // Verificar si ya existe una asignación para este pedido y mesero
        const existingAssignment = await prisma.pedidoMesero.findFirst({
            where: {
                id_pedido: parseInt(id_pedido),
                id_mesero: parseInt(id_mesero)
            }
        });

        if (existingAssignment) {
            return res.status(400).json({ error: 'Ya existe una asignación para este pedido y mesero' });
        }

        // Crear la asignación
        const newAssignment = await prisma.pedidoMesero.create({
            data: {
                id_pedido: parseInt(id_pedido),
                id_mesero: parseInt(id_mesero)
            },
            include: {
                mesero: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                }
            }
        });

        // Transformar los datos para la respuesta
        const transformedAssignment = {
            id: newAssignment.id,
            id_pedido: newAssignment.id_pedido,
            id_mesero: newAssignment.id_mesero,
            nombre_mesero: `${newAssignment.mesero.nombre} ${newAssignment.mesero.apellido}`
        };

        res.status(201).json(transformedAssignment);
    } catch (error) {
        console.error('Error en createAssignment:', error);
        res.status(500).json({ message: 'Error al crear asignación', error: error.message });
    }
};

/**
 * Eliminar una asignación de mesero a pedido
 */
const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la asignación existe
        const assignment = await prisma.pedidoMesero.findUnique({
            where: { id: parseInt(id) }
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada' });
        }

        // Eliminar la asignación
        await prisma.pedidoMesero.delete({
            where: { id: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteAssignment:', error);
        res.status(500).json({ message: 'Error al eliminar asignación', error: error.message });
    }
};

module.exports = {
    getAllAssignments,
    createAssignment,
    deleteAssignment
};