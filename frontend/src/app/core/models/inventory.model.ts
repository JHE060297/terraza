export interface Producto {
    id_producto: number;
    nombre_producto: string;
    descripcion?: string;
    precio_compra: number;
    precio_venta: number;
    image?: string;
    is_active: boolean;
}

export interface Inventario {
    id_inventario: number;
    id_producto: number;
    nombre_producto?: string;
    id_sucursal: number;
    nombre_sucursal?: string;
    cantidad: number;
    alerta: number;
    is_low_stock?: boolean;
}

export interface TransaccionInventario {
    id_transaccion: number;
    id_producto: number;
    nombre_producto?: string;
    id_sucursal: number;
    nombre_sucursal?: string;
    cantidad: number;
    tipo_transaccion: 'compra' | 'venta' | 'ajuste' | 'transferencia';
    transaccion_fecha_hora: string;
    id_usuario?: number;
    nombre_usuario?: string;
}

export interface AjusteInventario {
    cantidad: number;
    tipo_transaccion: string;
}