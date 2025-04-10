const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

const prisma = new PrismaClient();

/**
 * Iniciar sesión de usuario
 */
const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        // Verificar si el usuario existe
        const user = await prisma.usuario.findUnique({
            where: { usuario: usuario },
            include: {
                rol: true,
                sucursal: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Verificar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.contrasena);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Estructurar la respuesta similar a Django para compatibilidad con el frontend
        res.json({
            access: accessToken,
            refresh: refreshToken
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
};

/**
 * Renovar el token de acceso utilizando el token de actualización
 */
const refreshToken = async (req, res) => {
    try {
        const { refresh } = req.body;

        if (!refresh) {
            return res.status(400).json({ message: 'Token de actualización no proporcionado' });
        }

        // Verificar el token de actualización
        const decoded = verifyToken(refresh);
        if (!decoded) {
            return res.status(401).json({ message: 'Token de actualización inválido o expirado' });
        }

        // Obtener el usuario
        const user = await prisma.usuario.findUnique({
            where: { id_usuario: decoded.user_id },
            include: {
                rol: true,
                sucursal: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
        }

        // Generar un nuevo token de acceso
        const accessToken = generateToken(user);

        // Responder con el nuevo token
        res.json({
            access: accessToken
        });
    } catch (error) {
        console.error('Error en refreshToken:', error);
        res.status(500).json({ message: 'Error al renovar el token', error: error.message });
    }
};

module.exports = {
    login,
    refreshToken
};