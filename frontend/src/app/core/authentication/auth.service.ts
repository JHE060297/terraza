import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, UserCredentials, Usuario } from '../models/user.model';
import { Router } from '@angular/router';
import { InventoryService } from '../services/inventory.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.apiUrl;
    public currentUserSubject = new BehaviorSubject<Usuario | null>(null);
    private tokenKey = 'access_token';
    private refreshTokenKey = 'refresh_token';
    private userKey = 'current_user';


    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(
        private http: HttpClient,
        private router: Router,
        private inventoryService: InventoryService
    ) {
        // Cargar el usuario del localStorage al iniciar
        const savedUser = localStorage.getItem(this.userKey);
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                this.currentUserSubject.next(user);
            } catch (error) {
                console.error('Error al parsear usuario guardado', error);
                localStorage.removeItem(this.userKey);
            }
        }
    }

    login(credentials: UserCredentials): Observable<boolean> {
        // Modificado: usar la ruta correcta para autenticación según el backend Node.js
        return this.http.post<AuthResponse>(`${this.apiUrl}token/`, credentials)
            .pipe(
                tap(response => {
                    // Guardar tokens
                    localStorage.setItem(this.tokenKey, response.access);
                    localStorage.setItem(this.refreshTokenKey, response.refresh);

                    // Obtener datos de usuario desde el token JWT (decodificación básica)
                    try {
                        const payload = JSON.parse(atob(response.access.split('.')[1]));

                        const user: Usuario = {
                            id_usuario: payload.user_id,
                            nombre: payload.nombre || '',
                            apellido: payload.apellido || '',
                            usuario: credentials.usuario,
                            id_rol: payload.id_rol || 0,
                            rol_nombre: payload.rol || '',
                            id_sucursal: payload.id_sucursal || 0,
                        };

                        // Guardar usuario en localStorage
                        localStorage.setItem(this.userKey, JSON.stringify(user));

                        // Actualizar BehaviorSubject
                        this.currentUserSubject.next(user);

                        // Navegar al dashboard después de login exitoso
                        this.router.navigate(['/dashboard']);
                    } catch (error) {
                        console.error('Error al decodificar token', error);
                    }
                }),
                map(() => true),
                catchError(error => {
                    console.error('Error de autenticación', error);
                    return of(false);
                })
            );
    }

    logout(): void {
        this.inventoryService.clearSubscriptions();

        // Limpiar localStorage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);

        // Actualizar BehaviorSubject
        this.currentUserSubject.next(null);

        // Redirigir a login
        setTimeout(() => {
            this.router.navigate(['/login']);
        }, 0);
    }

    refreshToken(): Observable<string> {
        const refreshToken = localStorage.getItem(this.refreshTokenKey);

        if (!refreshToken) {
            // Si no hay refresh token, redirigir a login
            this.logout();
            return of('');
        }

        // Modificado: usar la ruta correcta para renovar token según el backend Node.js
        return this.http.post<{ access: string }>(`${this.apiUrl}token/refresh/`, { refresh: refreshToken })
            .pipe(
                tap(response => {
                    localStorage.setItem(this.tokenKey, response.access);
                }),
                map(response => response.access),
                catchError(error => {
                    console.error('Error al refrescar token', error);
                    this.logout();
                    return of('');
                })
            );
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    hasRole(roleName: string): boolean {
        const user = this.currentUserSubject.value;
        if (!user) return false;
        // Comprobar el rol específico
        return user.rol_nombre === roleName;
    }

    // Verificar por tipo de rol
    isAdmin(): boolean {
        return this.hasRole('administrador');
    }

    isCajero(): boolean {
        return this.hasRole('cajero');
    }

    isMesero(): boolean {
        return this.hasRole('mesero');
    }
}