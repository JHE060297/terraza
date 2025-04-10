const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Usuario para el que se genera el token
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
    const payload = {
        user_id: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol.nombre,
        is_admin: user.rol.nombre === 'administrador',
        id_sucursal: user.id_sucursal,
        id_rol: user.id_rol
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION || '1h'
    });
};

/**
 * Genera un token de actualización JWT
 * @param {Object} user - Usuario para el que se genera el token
 * @returns {String} Token de actualización JWT
 */
const generateRefreshToken = (user) => {
    const payload = {
        user_id: user.id_usuario
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1d'
    });
};

/**
 * Verifica un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object} Payload decodificado o null si el token es inválido
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken
};