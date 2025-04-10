export interface Rol {
    id_rol: number;
    nombre: string;
}

export interface Sucursal {
    id_sucursal: number;
    nombre_sucursal: string;
    direccion: string;
    telefono: string;
    mesas_count?: number;
}

export interface Usuario {
    id_usuario: number;
    nombre: string;
    apellido: string;
    usuario: string;
    id_rol: number;
    rol_nombre?: string;
    id_sucursal: number;
    sucursal_nombre?: string;
}

export interface UserCredentials {
    usuario: string;
    password: string;
}

export interface AuthResponse {
    access: string;
    refresh: string;
}