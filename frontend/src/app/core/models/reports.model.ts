// En frontend/src/app/core/models/reports.model.ts (actualizar el archivo existente)
export interface Reporte {
    id_reporte?: number;
    usuario: number;
    usuario_nombre?: string;
    sucursal?: number;
    sucursal_nombre?: string;
    fecha_generacion: string;
    fecha_inicio: string;
    fecha_fin: string;
    formato: 'xlsx' | 'csv' | 'json' | 'pdf';
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

export interface ReporteCompleto {
    resumen: ResumenVentas;
    detalles: DetalleVentaProducto[];
    fecha_generacion: string;
    fecha_inicio: string;
    fecha_fin: string;
    id_sucursal?: number;
    id_usuario: number;
    id_reporte?: number;
}