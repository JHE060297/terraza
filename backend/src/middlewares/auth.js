const { verifyToken } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware para verificar que el usuario está autenticado
 */
const isAuthenticated = (req, res, next) => {
    try {
        // Obtener el token del encabezado Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
        }

        // Verificar el token
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        // Guardar la información del usuario en el objeto request
        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Error de autenticación', error: error.message });
    }
};

/**
 * Middleware para verificar que el usuario es administrador
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    return next();
};

/**
 * Middleware para verificar que el usuario es cajero o administrador
 */
const isAdminOrCashier = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (req.user.rol !== 'administrador' && req.user.rol !== 'cajero') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador o cajero' });
    }

    return next();
};

/**
 * Middleware para verificar que el usuario es mesero
 */
const isWaiter = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (req.user.rol !== 'mesero') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de mesero' });
    }

    return next();
};

/**
 * Middleware para verificar que el usuario es administrador, cajero o mesero
 */
const isAdminOrCashierOrWaiter = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (req.user.rol !== 'administrador' && req.user.rol !== 'cajero' && req.user.rol !== 'mesero') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador, cajero o mesero' });
    }

    return next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isAdminOrCashier,
    isWaiter,
    isAdminOrCashierOrWaiter
};