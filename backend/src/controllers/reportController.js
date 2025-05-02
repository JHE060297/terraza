const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

/**
 * Generar un reporte de ventas
 */
const generateSalesReport = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fecha_inicio, fecha_fin, id_sucursal, formato = 'xlsx' } = req.body;
        const userId = req.user.user_id;

        // Validar el formato
        const formatosValidos = ['xlsx', 'csv', 'json'];
        if (!formatosValidos.includes(formato)) {
            return res.status(400).json({ message: 'Formato no válido' });
        }

        // Ejecutar el stored procedure usando Prisma
        const result = await prisma.$queryRaw`
            CALL GenerarReporteVentas(
                ${new Date(fecha_inicio)}, 
                ${new Date(fecha_fin)}, 
                ${id_sucursal ? parseInt(id_sucursal) : null}
            )
        `;

        // Extraer resultados
        const resumen = result[0][0]; // Primera tabla: resumen
        const detalles = result[1];   // Segunda tabla: detalles por producto

        // Preparar respuesta según el formato solicitado
        if (formato === 'json') {
            return res.json({
                resumen,
                detalles,
                fecha_generacion: new Date(),
                fecha_inicio,
                fecha_fin,
                id_sucursal,
                id_usuario: userId
            });
        } else if (formato === 'xlsx' || formato === 'csv') {
            // Crear el archivo Excel o CSV
            const wb = XLSX.utils.book_new();

            // Hoja de resumen
            const resumenSheet = XLSX.utils.json_to_sheet([resumen]);
            XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

            // Hoja de detalles
            const detallesSheet = XLSX.utils.json_to_sheet(detalles);
            XLSX.utils.book_append_sheet(wb, detallesSheet, 'Detalles');

            // Convertir a buffer
            const buffer = formato === 'xlsx'
                ? XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
                : XLSX.write(wb, { type: 'string', bookType: 'csv' });

            // Enviar respuesta
            res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_${new Date().toISOString().split('T')[0]}.${formato}`);

            if (formato === 'xlsx') {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                return res.send(buffer);
            } else {
                res.setHeader('Content-Type', 'text/csv');
                return res.send(buffer);
            }
        }
    } catch (error) {
        console.error('Error en generateSalesReport:', error);
        res.status(500).json({ message: 'Error al generar reporte', error: error.message });
    }
};

module.exports = {
    generateSalesReport
};