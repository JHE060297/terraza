const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurarse de que el directorio de uploads existe
const uploadDir = path.join(__dirname, '../../uploads');
const productsDir = path.join(uploadDir, 'products');

// Crear directorios si no existen
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
}

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determinar el destino según el tipo de archivo
        let destination = uploadDir;

        // Si es una imagen de producto, guardarla en products/
        if (req.originalUrl.includes('/productos')) {
            destination = productsDir;
        }

        cb(null, destination);
    },
    filename: function (req, file, cb) {
        // Generar un nombre de archivo único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Filtro para validar tipos de archivos
const fileFilter = (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo debe ser una imagen'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    }
});

module.exports = {
    upload,
    uploadDir,
    productsDir
};