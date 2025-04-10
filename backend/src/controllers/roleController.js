const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todos los roles
 */
const getAllRoles = async (req, res) => {
    try {
        const roles = await prisma.rol.findMany({
            orderBy: {
                nombre: 'asc'
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedRoles = roles.map(role => ({
            id_rol: role.id_rol,
            nombre: role.nombre
        }));

        res.json(transformedRoles);
    } catch (error) {
        console.error('Error en getAllRoles:', error);
        res.status(500).json({ message: 'Error al obtener roles', error: error.message });
    }
};

/**
 * Obtener un rol por ID
 */
const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await prisma.rol.findUnique({
            where: { id_rol: parseInt(id) }
        });

        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Transformar los datos para la respuesta
        const transformedRole = {
            id_rol: role.id_rol,
            nombre: role.nombre
        };

        res.json(transformedRole);
    } catch (error) {
        console.error('Error en getRoleById:', error);
        res.status(500).json({ message: 'Error al obtener rol', error: error.message });
    }
};

module.exports = {
    getAllRoles,
    getRoleById
};