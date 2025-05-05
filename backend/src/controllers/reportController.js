const { PrismaClient, Prisma } = require('@prisma/client');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const generateSalesReport = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, id_sucursal, formato = 'xlsx' } = req.body;
        const userId = req.user.user_id;

        console.log('Parametros recibidos:', { fecha_inicio, fecha_fin, id_sucursal, formato });

        // Convertir las fechas a formato ISO para asegurar que se manejen correctamente
        const fechaInicioSQL = new Date(fecha_inicio).toISOString().split('T')[0];
        const fechaFinSQL = new Date(fecha_fin).toISOString().split('T')[0];

        // Armar la consulta SQL con seguridad y sin errores de sintaxis
        const query = Prisma.sql`
            SELECT 
                pr.id_producto,
                pr.nombre_producto,
                SUM(dp.cantidad) AS cantidad_total,
                SUM(pr.precio_compra * dp.cantidad) AS costo_total,
                SUM(dp.precio_unitario * dp.cantidad) AS ingreso_total,
                SUM((dp.precio_unitario - pr.precio_compra) * dp.cantidad) AS ganancia,
                s.nombre_sucursal AS sede
            FROM pedido p
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            JOIN productos pr ON dp.id_producto = pr.id_producto
            JOIN mesa m ON p.id_mesa = m.id_mesa
            JOIN sucursal s ON m.id_sucursal = s.id_sucursal
            WHERE p.estado = 'pagado'
            AND p.fecha_de_creacion BETWEEN ${fechaInicioSQL} AND ${fechaFinSQL}
            ${id_sucursal ? Prisma.sql`AND m.id_sucursal = ${parseInt(id_sucursal)}` : Prisma.empty}
            GROUP BY pr.id_producto, pr.nombre_producto, s.nombre_sucursal
            ORDER BY ganancia DESC;
        `;

        console.log('Consulta final generada:', query);

        // Ejecutar la consulta SQL
        const detalles = await prisma.$queryRaw(query);

        console.log('Detalles obtenidos:', detalles);

        // Preparar la respuesta según el formato
        if (formato === 'json') {
            return res.json({
                detalles,
                fecha_generacion: new Date(),
                fecha_inicio: fechaInicioSQL,
                fecha_fin: fechaFinSQL,
                id_sucursal,
                id_usuario: userId,
            });
        }

        const wb = XLSX.utils.book_new();
        const detallesSheet = XLSX.utils.json_to_sheet(detalles);
        XLSX.utils.book_append_sheet(wb, detallesSheet, 'Detalles');

        const buffer = formato === 'xlsx'
            ? XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
            : XLSX.write(wb, { type: 'string', bookType: 'csv' });

        res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_${fechaFinSQL}.${formato}`);
        res.setHeader('Content-Type',
            formato === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv');

        return res.send(buffer);
    } catch (error) {
        console.error('Error al generar el reporte:', error);
        res.status(500).json({ message: 'Error al generar reporte', error: error.message });
    }
};

module.exports = {
    generateSalesReport
};
