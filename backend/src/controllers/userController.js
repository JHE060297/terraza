const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener todos los usuarios
 */
const getAllUsers = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.id_rol) {
            filters.id_rol = parseInt(req.query.id_rol);
        }

        if (req.query.id_sucursal) {
            filters.id_sucursal = parseInt(req.query.id_sucursal);
        }

        // Búsqueda por texto
        let whereClause = { ...filters };
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                OR: [
                    { nombre: { contains: search } },
                    { apellido: { contains: search } },
                    { usuario: { contains: search } }
                ]
            };
        }

        // Determinar ordenamiento
        const orderBy = {};
        if (req.query.ordering) {
            const orderField = req.query.ordering.startsWith('-')
                ? req.query.ordering.substring(1)
                : req.query.ordering;

            const orderDirection = req.query.ordering.startsWith('-') ? 'desc' : 'asc';

            // Mapeo de campos de ordenamiento
            const fieldMapping = {
                'nombre': 'nombre',
                'apellido': 'apellido',
                'usuario': 'usuario',
                'id_rol': 'id_rol'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        }

        // Obtener usuarios con filtros y ordenamiento
        const users = await prisma.usuario.findMany({
            where: whereClause,
            orderBy,
            include: {
                rol: {
                    select: {
                        nombre: true
                    }
                },
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedUsers = users.map(user => ({
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            id_rol: user.id_rol,
            rol_nombre: user.rol.nombre,
            id_sucursal: user.id_sucursal,
            sucursal_nombre: user.sucursal.nombre_sucursal,
        }));

        res.json(transformedUsers);
    } catch (error) {
        console.error('Error en getAllUsers:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

/**
 * Obtener un usuario por ID
 */
const getUserById = async (req, res) => {
    try {

        const { id } = req.params;

        const user = await prisma.usuario.findUnique({
            where: { id_usuario: parseInt(id) },
            include: {
                rol: {
                    select: {
                        nombre: true
                    }
                },
                sucursal: {
                    select: {
                        nombre_sucursal: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedUser = {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            id_rol: user.id_rol,
            rol_nombre: user.rol.nombre,
            id_sucursal: user.id_sucursal,
            sucursal_nombre: user.sucursal.nombre_sucursal,
        };

        res.json(transformedUser);
    } catch (error) {
        console.error('Error en getUserById:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
};

/**
 * Crear un nuevo usuario
 */
const createUser = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, apellido, usuario, password, id_rol, id_sucursal } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.usuario.findUnique({
            where: { usuario }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
        }

        // Verificar si el rol existe
        const rol = await prisma.rol.findUnique({
            where: { id_rol: parseInt(id_rol) }
        });

        if (!rol) {
            return res.status(400).json({ message: 'El rol especificado no existe' });
        }

        // Verificar si la sucursal existe
        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursal) {
            return res.status(400).json({ message: 'La sucursal especificada no existe' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario
        const newUser = await prisma.usuario.create({
            data: {
                nombre,
                apellido,
                usuario,
                contrasena: hashedPassword,
                id_rol: parseInt(id_rol),
                id_sucursal: parseInt(id_sucursal),
            },
            include: {
                rol: {
                    select: {
                        nombre: true
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
        const transformedUser = {
            id_usuario: newUser.id_usuario,
            nombre: newUser.nombre,
            apellido: newUser.apellido,
            usuario: newUser.usuario,
            id_rol: newUser.id_rol,
            rol_nombre: newUser.rol.nombre,
            id_sucursal: newUser.id_sucursal,
            sucursal_nombre: newUser.sucursal.nombre_sucursal,
        };

        res.status(201).json(transformedUser);
    } catch (error) {
        console.error('Error en createUser:', error);
        res.status(500).json({ message: 'Error al crear usuario', error: error.message });
    }
};

/**
 * Actualizar un usuario
 */
const updateUser = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { nombre, apellido, usuario, password, id_rol, id_sucursal } = req.body;

        // Verificar si el usuario existe
        const existingUser = await prisma.usuario.findUnique({
            where: { id_usuario: parseInt(id) }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si el nombre de usuario está en uso por otro usuario
        if (usuario && usuario !== existingUser.usuario) {
            const userWithSameUsername = await prisma.usuario.findUnique({
                where: { usuario }
            });

            if (userWithSameUsername) {
                return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
            }
        }

        // Preparar los datos para actualizar
        const updateData = {};

        if (nombre !== undefined) updateData.nombre = nombre;
        if (apellido !== undefined) updateData.apellido = apellido;
        if (usuario !== undefined) updateData.usuario = usuario;
        if (id_rol !== undefined) updateData.id_rol = parseInt(id_rol);
        if (id_sucursal !== undefined) updateData.id_sucursal = parseInt(id_sucursal);

        // Hashear la contraseña si se proporciona
        if (password) {
            updateData.contrasena = await bcrypt.hash(password, 10);
        }

        // Actualizar el usuario
        const updatedUser = await prisma.usuario.update({
            where: { id_usuario: parseInt(id) },
            data: updateData,
            include: {
                rol: {
                    select: {
                        nombre: true
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
        const transformedUser = {
            id_usuario: updatedUser.id_usuario,
            nombre: updatedUser.nombre,
            apellido: updatedUser.apellido,
            usuario: updatedUser.usuario,
            id_rol: updatedUser.id_rol,
            rol_nombre: updatedUser.rol.nombre,
            id_sucursal: updatedUser.id_sucursal,
            sucursal_nombre: updatedUser.sucursal.nombre_sucursal,
        };

        res.json(transformedUser);
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
};

/**
 * Eliminar un usuario
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el usuario existe
        const existingUser = await prisma.usuario.findUnique({
            where: { id_usuario: parseInt(id) }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Eliminar el usuario
        await prisma.usuario.delete({
            where: { id_usuario: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
};

/**
 * Cambiar el rol de un usuario
 */
const changeRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_rol } = req.body;

        if (!id_rol) {
            return res.status(400).json({ error: 'ID del rol no proporcionado' });
        }

        // Verificar si el usuario existe
        const existingUser = await prisma.usuario.findUnique({
            where: { id_usuario: parseInt(id) }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si el rol existe
        const existingRole = await prisma.rol.findUnique({
            where: { id_rol: parseInt(id_rol) }
        });

        if (!existingRole) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        // Cambiar el rol del usuario
        await prisma.usuario.update({
            where: { id_usuario: parseInt(id) },
            data: { id_rol: parseInt(id_rol) }
        });

        res.json({ status: 'rol cambiado exitosamente' });
    } catch (error) {
        console.error('Error en changeRole:', error);
        res.status(500).json({ message: 'Error al cambiar rol', error: error.message });
    }
};

/**
 * Cambiar la sucursal de un usuario
 */
const changeBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursal } = req.body;

        if (!id_sucursal) {
            return res.status(400).json({ error: 'ID de la sucursal no proporcionado' });
        }

        // Verificar si el usuario existe
        const existingUser = await prisma.usuario.findUnique({
            where: { id_usuario: parseInt(id) }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si la sucursal existe
        const existingBranch = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!existingBranch) {
            return res.status(404).json({ error: 'Sucursal no encontrada' });
        }

        // Cambiar la sucursal del usuario
        await prisma.usuario.update({
            where: { id_usuario: parseInt(id) },
            data: { id_sucursal: parseInt(id_sucursal) }
        });

        res.json({ status: 'sucursal cambiada exitosamente' });
    } catch (error) {
        console.error('Error en changeBranch:', error);
        res.status(500).json({ message: 'Error al cambiar sucursal', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changeRole,
    changeBranch
};