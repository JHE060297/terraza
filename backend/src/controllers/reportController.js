const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Obtener todos los reportes
 */
const getAllReports = async (req, res) => {
    try {
        const user = req.user;
        let whereClause = {};

        // Si no es admin, solo ve los reportes de su sucursal
        if (!user.is_admin) {
            whereClause.id_sucursal = parseInt(user.id_sucursal);
        }

        // Aplicar filtros adicionales si existen
        if (req.query.id_usuario) {
            whereClause.id_usuario = parseInt(req.query.id_usuario);
        }

        if (req.query.id_sucursal) {
            whereClause.id_sucursal = parseInt(req.query.id_sucursal);
        }

        if (req.query.formato) {
            whereClause.formato = req.query.formato;
        }

        // Búsqueda en usuario o sucursal
        if (req.query.search) {
            const search = req.query.search;
            whereClause = {
                ...whereClause,
                OR: [
                    {
                        usuario: {
                            OR: [
                                { nombre: { contains: search } },
                                { apellido: { contains: search } }
                            ]
                        }
                    },
                    {
                        sucursal: {
                            nombre_sucursal: { contains: search }
                        }
                    }
                ]
            };
        }

        // Determinar ordenamiento
        let orderBy = {};
        if (req.query.ordering) {
            const orderField = req.query.ordering.startsWith('-')
                ? req.query.ordering.substring(1)
                : req.query.ordering;

            const orderDirection = req.query.ordering.startsWith('-') ? 'desc' : 'asc';

            // Mapeo de campos de ordenamiento
            const fieldMapping = {
                'fecha_generacion': 'fecha_generacion',
                'fecha_inicio': 'fecha_inicio',
                'fecha_fin': 'fecha_fin'
            };

            if (fieldMapping[orderField]) {
                orderBy[fieldMapping[orderField]] = orderDirection;
            }
        } else {
            // Ordenamiento por defecto
            orderBy.fecha_generacion = 'desc';
        }

        // Obtener reportes con filtros y ordenamiento
        const reportes = await prisma.reporte.findMany({
            where: whereClause,
            orderBy,
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true
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
        const transformedReportes = reportes.map(reporte => ({
            id_reporte: reporte.id_reporte,
            id_usuario: reporte.id_usuario,
            usuario_nombre: `${reporte.usuario.nombre} ${reporte.usuario.apellido}`,
            id_sucursal: reporte.id_sucursal,
            sucursal_nombre: reporte.sucursal.nombre_sucursal,
            fecha_generacion: reporte.fecha_generacion,
            fecha_inicio: reporte.fecha_inicio,
            fecha_fin: reporte.fecha_fin,
            formato: reporte.formato
        }));

        res.json(transformedReportes);
    } catch (error) {
        console.error('Error en getAllReports:', error);
        res.status(500).json({ message: 'Error al obtener reportes', error: error.message });
    }
};

/**
 * Crear un nuevo reporte
 */
const createReport = async (req, res) => {
    try {
        // Validar los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_sucursal, fecha_inicio, fecha_fin, formato } = req.body;
        const id_usuario = req.user.user_id;

        // Verificar si el usuario puede generar reportes para la sucursal especificada
        if (!req.user.is_admin && req.user.id_sucursal !== parseInt(id_sucursal)) {
            return res.status(403).json({
                error: 'No tiene permisos para generar reportes de esta sucursal'
            });
        }

        // Verificar si la sucursal existe
        const sucursal = await prisma.sucursal.findUnique({
            where: { id_sucursal: parseInt(id_sucursal) }
        });

        if (!sucursal) {
            return res.status(400).json({ message: 'La sucursal especificada no existe' });
        }

        // Validar el formato
        const formatosValidos = ['xlsx', 'csv', 'pdf'];
        if (!formatosValidos.includes(formato)) {
            return res.status(400).json({ message: 'Formato no válido' });
        }

        // Crear el reporte
        const newReporte = await prisma.reporte.create({
            data: {
                id_usuario: parseInt(id_usuario),
                id_sucursal: parseInt(id_sucursal),
                fecha_inicio: new Date(fecha_inicio),
                fecha_fin: new Date(fecha_fin),
                formato
            },
            include: {
                usuario: {
                    select: {
                        nombre: true,
                        apellido: true
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
        const transformedReporte = {
            id_reporte: newReporte.id_reporte,
            id_usuario: newReporte.id_usuario,
            usuario_nombre: `${newReporte.usuario.nombre} ${newReporte.usuario.apellido}`,
            id_sucursal: newReporte.id_sucursal,
            sucursal_nombre: newReporte.sucursal.nombre_sucursal,
            fecha_generacion: newReporte.fecha_generacion,
            fecha_inicio: newReporte.fecha_inicio,
            fecha_fin: newReporte.fecha_fin,
            formato: newReporte.formato
        };

        res.status(201).json(transformedReporte);
    } catch (error) {
        console.error('Error en createReport:', error);
        res.status(500).json({ message: 'Error al crear reporte', error: error.message });
    }
};

/**
 * Descargar un reporte
 */
const downloadReport = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener el reporte
        const reporte = await prisma.reporte.findUnique({
            where: { id_reporte: parseInt(id) },
            include: {
                sucursal: true,
                usuario: true
            }
        });

        if (!reporte) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }

        // Verificar permisos
        if (!req.user.is_admin && req.user.id_sucursal !== reporte.id_sucursal) {
            return res.status(403).json({
                error: 'No tiene permisos para descargar este reporte'
            });
        }

        // Obtener datos del reporte
        const fechaInicio = reporte.fecha_inicio;
        const fechaFin = reporte.fecha_fin;
        const sucursal = reporte.sucursal;

        // Filtrar pedidos según criterios
        let pedidosQuery = {
            where: {
                fecha_de_creacion: {
                    gte: fechaInicio,
                    lte: fechaFin
                },
                estado: 'pagado'
            },
            include: {
                detalles: {
                    include: {
                        producto: true
                    }
                },
                mesa: {
                    include: {
                        sucursal: true
                    }
                }
            }
        };

        // Si el reporte es por sucursal específica y el usuario no es admin, filtrar por sucursal
        if (!req.user.is_admin || (req.user.is_admin && sucursal)) {
            pedidosQuery.where.mesa = {
                id_sucursal: sucursal.id_sucursal
            };
        }

        const pedidos = await prisma.pedido.findMany(pedidosQuery);

        // Procesar los datos para el reporte
        const detallesAgrupados = [];
        let totalPedidos = 0;
        let totalVentas = 0;
        let totalGanancia = 0;

        // Agrupar por producto
        const productosMap = new Map();

        // Procesar cada pedido y sus detalles
        pedidos.forEach(pedido => {
            totalPedidos++;
            totalVentas += parseFloat(pedido.total);

            pedido.detalles.forEach(detalle => {
                const producto = detalle.producto;
                const cantidad = detalle.cantidad;
                const precioUnitario = parseFloat(detalle.precio_unitario);
                const precioCompra = parseFloat(producto.precio_compra);

                const ingresoTotal = cantidad * precioUnitario;
                const costoTotal = cantidad * precioCompra;
                const ganancia = ingresoTotal - costoTotal;

                totalGanancia += ganancia;

                // Agregar o actualizar en el mapa
                const key = producto.id_producto;
                if (productosMap.has(key)) {
                    const item = productosMap.get(key);
                    item.cantidad_total += cantidad;
                    item.ingreso_total += ingresoTotal;
                    item.costo_total += costoTotal;
                    item.ganancia += ganancia;
                } else {
                    productosMap.set(key, {
                        nombre_producto: producto.nombre_producto,
                        cantidad_total: cantidad,
                        ingreso_total: ingresoTotal,
                        costo_total: costoTotal,
                        ganancia: ganancia
                    });
                }
            });
        });

        // Convertir el mapa a un array
        for (const [id, datos] of productosMap.entries()) {
            detallesAgrupados.push({
                id_producto: id,
                nombre_producto: datos.nombre_producto,
                cantidad_total: datos.cantidad_total,
                ingreso_total: datos.ingreso_total,
                costo_total: datos.costo_total,
                ganancia: datos.ganancia,
                margen: datos.ingreso_total > 0 ? (datos.ganancia / datos.ingreso_total) * 100 : 0
            });
        }

        // Ordenar por ingreso total descendente
        detallesAgrupados.sort((a, b) => b.ingreso_total - a.ingreso_total);

        // Crear resumen
        const resumen = {
            total_pedidos: totalPedidos,
            total_ventas: totalVentas,
            total_ganancia: totalGanancia
        };

        // Generar el archivo según el formato
        if (reporte.formato === 'xlsx') {
            const excelBuffer = generarExcel(detallesAgrupados, resumen, reporte);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_${reporte.id_reporte}.xlsx`);
            res.send(excelBuffer);
        } else if (reporte.formato === 'csv') {
            const csvString = generarCSV(detallesAgrupados, resumen, reporte);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_${reporte.id_reporte}.csv`);
            res.send(csvString);
        } else if (reporte.formato === 'pdf') {
            return res.status(501).json({
                error: 'Formato PDF aún no implementado'
            });
        } else {
            return res.status(400).json({
                error: 'Formato no válido'
            });
        }
    } catch (error) {
        console.error('Error en downloadReport:', error);
        res.status(500).json({ message: 'Error al descargar reporte', error: error.message });
    }
};

/**
 * Generar archivo Excel
 */
const generarExcel = (detalles, resumen, reporte) => {
    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();

    // Título y metadatos
    const infoSheet = XLSX.utils.aoa_to_sheet([
        [`REPORTE DE VENTAS - ${reporte.sucursal.nombre_sucursal}`],
        [`Fecha de generación: ${reporte.fecha_generacion.toISOString().split('T')[0]} ${reporte.fecha_generacion.toISOString().split('T')[1].split('.')[0]}`],
        [`Período: ${reporte.fecha_inicio.toISOString().split('T')[0]} al ${reporte.fecha_fin.toISOString().split('T')[0]}`],
        [`Generado por: ${reporte.usuario.nombre} ${reporte.usuario.apellido}`],
        [],
        ['RESUMEN'],
        ['Total de pedidos:', resumen.total_pedidos],
        ['Total de ventas:', resumen.total_ventas.toFixed(2)],
        ['Total ganancia:', resumen.total_ganancia.toFixed(2)],
        [],
        ['DETALLE DE PRODUCTOS VENDIDOS']
    ]);

    // Agregar hoja con información
    XLSX.utils.book_append_sheet(wb, infoSheet, 'Información');

    // Crear hoja para detalles
    const headers = ['Producto', 'Cantidad', 'Costo Total', 'Ingreso Total', 'Ganancia', 'Margen (%)'];
    const detallesData = detalles.map(item => [
        item.nombre_producto,
        item.cantidad_total,
        item.costo_total.toFixed(2),
        item.ingreso_total.toFixed(2),
        item.ganancia.toFixed(2),
        `${item.margen.toFixed(2)}%`
    ]);

    // Agregar encabezados a los datos
    detallesData.unshift(headers);

    // Crear hoja de detalles
    const detallesSheet = XLSX.utils.aoa_to_sheet(detallesData);

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, detallesSheet, 'Detalles');

    // Escribir a buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
};

/**
 * Generar archivo CSV
 */
const generarCSV = (detalles, resumen, reporte) => {
    let csvString = '';

    // Título y metadatos
    csvString += `REPORTE DE VENTAS - ${reporte.sucursal.nombre_sucursal}\n`;
    csvString += `Fecha de generación: ${reporte.fecha_generacion.toISOString().split('T')[0]} ${reporte.fecha_generacion.toISOString().split('T')[1].split('.')[0]}\n`;
    csvString += `Período: ${reporte.fecha_inicio.toISOString().split('T')[0]} al ${reporte.fecha_fin.toISOString().split('T')[0]}\n`;
    csvString += `Generado por: ${reporte.usuario.nombre} ${reporte.usuario.apellido}\n\n`;

    // Resumen
    csvString += 'RESUMEN\n';
    csvString += `Total de pedidos,${resumen.total_pedidos}\n`;
    csvString += `Total de ventas,${resumen.total_ventas.toFixed(2)}\n`;
    csvString += `Total ganancia,${resumen.total_ganancia.toFixed(2)}\n\n`;

    // Detalles de productos
    csvString += 'DETALLE DE PRODUCTOS VENDIDOS\n';
    csvString += 'Producto,Cantidad,Costo Total,Ingreso Total,Ganancia,Margen (%)\n';

    detalles.forEach(item => {
        csvString += `"${item.nombre_producto}",${item.cantidad_total},${item.costo_total.toFixed(2)},${item.ingreso_total.toFixed(2)},${item.ganancia.toFixed(2)},${item.margen.toFixed(2)}%\n`;
    });

    return csvString;
};

module.exports = {
    getAllReports,
    createReport,
    downloadReport
};