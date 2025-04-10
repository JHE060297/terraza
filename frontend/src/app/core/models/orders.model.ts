export interface Mesa {
    id_mesa: number;
    numero: number;
    id_sucursal: number;
    nombre_sucursal?: string;
    estado: 'libre' | 'ocupada' | 'pagado';
    estado_display?: string;
    is_active: boolean;
}

export interface Pedido {
    id_pedido: number;
    id_mesa: number;
    mesa_numero?: number;
    sucursal_nombre?: string;
    estado: 'pendiente' | 'entregado' | 'pagado';
    total: number;
    detalles?: DetallePedido[];
    created_at: string;
    updated_at: string;
}

export interface DetallePedido {
    id_detalle_pedido: number;
    id_pedido: number;
    id_producto: number;
    producto_nombre?: string;
    producto_precio?: number;
    cantidad: number;
    precio_unitario: number;
    subtotal?: number;
    descripcion?: string;
}

export interface PedidoMesero {
    id: number;
    id_pedido: number;
    id_mesero: number;
    nombre_mesero?: string;
}

export interface Pago {
    id_pago: number;
    id_pedido: number;
    pedido_detalle?: Pedido;
    id_usuario: number;
    nombre_cajero?: string;
    monto: number;
    metodo_pago: 'efectivo' | 'tarjeta' | 'nequi' | 'daviplata';
    fecha_hora: string;
    referencia_pago?: string;
}