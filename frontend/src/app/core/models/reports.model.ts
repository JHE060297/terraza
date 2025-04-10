export interface Reporte {
    id_reporte: number;
    usuario: number;
    usuario_nombre?: string;
    sucursal: number;
    sucursal_nombre?: string;
    fecha_generacion: string;
    fecha_inicio: string;
    fecha_fin: string;
    formato: 'xlsx' | 'csv' | 'pdf';
}

export interface ResumenVentas {
    total_pedidos: number;
    total_ventas: number;
    total_ganancia: number;
}

export interface DetalleVentaProducto {
    id_producto: number;
    nombre_producto: string;
    cantidad_total: number;
    costo_total: number;
    ingreso_total: number;
    ganancia: number;
    margen_porcentaje: number;
}