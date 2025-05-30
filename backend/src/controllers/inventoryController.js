const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Obtener todos los productos
 */
const getAllProducts = async (req, res) => {
    try {
        // Aplicar filtros si existen
        const filters = {};

        if (req.query.is_active !== undefined) {
            filters.is_active = req.query.is_active === 'true';
        }

        // Búsqueda por texto
        let whereClause = { ...filters };
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                OR: [
                    { nombre_producto: { contains: search } },
                    { descripcion: { contains: search } }
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
                'nombre_producto': 'nombre_producto',
                'precio_venta': 'precio_venta'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.nombre_producto = 'asc';
        }

        // Obtener productos con filtros y ordenamiento
        const productos = await prisma.producto.findMany({
            where: whereClause,
            orderBy
        });

        // Transformar los datos para incluir URLs completas de imágenes
        const host = req.protocol + '://' + req.get('host');
        const transformedProducts = productos.map(producto => ({
            ...producto,
            image_url: producto.image ? `${host}/media/${producto.image}` : null
        }));

        res.json(transformedProducts);
    } catch (error) {
        console.error('Error en getAllProducts:', error);
        res.status(500).json({ message: 'Error al obtener productos', error: error.message });
    }
};

/**
 * Obtener un producto por ID
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id) }
        });

        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Añadir URL completa de la imagen
        const host = req.protocol + '://' + req.get('host');
        const transformedProduct = {
            ...producto,
            image_url: producto.image ? `${host}/media/${producto.image}` : null
        };

        res.json(transformedProduct);
    } catch (error) {
        console.error('Error en getProductById:', error);
        res.status(500).json({ message: 'Error al obtener producto', error: error.message });
    }
};

/**
 * Crear un nuevo producto
 */
const createProduct = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre_producto, descripcion, precio_compra, precio_venta, is_active } = req.body;

        // Obtener la ruta de la imagen si se subió una
        let imagePath = null;
        if (req.file) {
            // Guardar la ruta relativa para compatibilidad con Django
            imagePath = path.join('products', req.file.filename).replace(/\\/g, '/');
        }

        // Iniciar una transacción para crear el producto y sus registros de inventario
        const result = await prisma.$transaction(async (prisma) => {          // 1. Crear el producto
            const newProduct = await prisma.producto.create({
                data: {
                    nombre_producto,
                    descripcion,
                    precio_compra: parseFloat(precio_compra),
                    precio_venta: parseFloat(precio_venta),
                    image: imagePath,
                    is_active: is_active !== undefined ? is_active === 'true' : true
                }
            });

            const sucursales = await prisma.sucursal.findMany();

            const inventarioPromises = sucursales.map(sucursal =>
                prisma.inventario.create({
                    data: {
                        id_producto: newProduct.id_producto,
                        id_sucursal: sucursal.id_sucursal,
                        cantidad: 0,
                        alerta: 10
                    }
                })
            );

            await Promise.all(inventarioPromises);

            return newProduct;
        });

        // Añadir URL completa de la imagen
        const host = req.protocol + '://' + req.get('host');
        const transformedProduct = {
            ...result,
            image_url: result.image ? `${host}/media/${result.image}` : null
        };

        res.status(201).json(transformedProduct);
    } catch (error) {
        console.error('Error en createProduct:', error);

        // Si hay un archivo subido, eliminarlo en caso de error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: 'Error al crear producto', error: error.message });
    }
};

/**
 * Actualizar un producto
 */
const updateProduct = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { nombre_producto, descripcion, precio_compra, precio_venta, is_active } = req.body;

        // Verificar si el producto existe
        const existingProduct = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id) }
        });

        if (!existingProduct) {
            // Si hay un archivo subido, eliminarlo
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Preparar los datos para actualizar
        const updateData = {};

        if (nombre_producto !== undefined) updateData.nombre_producto = nombre_producto;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (precio_compra !== undefined) updateData.precio_compra = parseFloat(precio_compra);
        if (precio_venta !== undefined) updateData.precio_venta = parseFloat(precio_venta);
        if (is_active !== undefined) updateData.is_active = is_active === 'true';

        // Manejar la imagen
        if (req.file) {
            // Eliminar la imagen anterior si existe
            if (existingProduct.image) {
                const oldImagePath = path.join(__dirname, '../../uploads', existingProduct.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // Guardar la ruta relativa de la nueva imagen
            updateData.image = path.join('products', req.file.filename).replace(/\\/g, '/');
        }

        // Actualizar el producto
        const updatedProduct = await prisma.producto.update({
            where: { id_producto: parseInt(id) },
            data: updateData
        });

        // Añadir URL completa de la imagen
        const host = req.protocol + '://' + req.get('host');
        const transformedProduct = {
            ...updatedProduct,
            image_url: updatedProduct.image ? `${host}/media/${updatedProduct.image}` : null
        };

        res.json(transformedProduct);
    } catch (error) {
        console.error('Error en updateProduct:', error);

        // Si hay un archivo subido, eliminarlo en caso de error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
    }
};

/**
 * Eliminar un producto
 */
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el producto existe
        const existingProduct = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id) }
        });

        if (!existingProduct) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Eliminar la imagen si existe
        if (existingProduct.image) {
            const imagePath = path.join(__dirname, '../../uploads', existingProduct.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Eliminar el producto
        await prisma.producto.delete({
            where: { id_producto: parseInt(id) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error en deleteProduct:', error);
        res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
    }
};

/**
 * Activar/desactivar un producto
 */
const toggleProductActive = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el producto existe
        const existingProduct = await prisma.producto.findUnique({
            where: { id_producto: parseInt(id) }
        });

        if (!existingProduct) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Cambiar el estado del producto
        const updatedProduct = await prisma.producto.update({
            where: { id_producto: parseInt(id) },
            data: { is_active: !existingProduct.is_active }
        });

        const status_text = updatedProduct.is_active ? "activado" : "desactivado";
        res.json({ status: `Producto ${status_text} exitosamente` });
    } catch (error) {
        console.error('Error en toggleProductActive:', error);
        res.status(500).json({ message: 'Error al cambiar estado del producto', error: error.message });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive
};