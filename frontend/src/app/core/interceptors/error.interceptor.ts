import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../authentication/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    return next(req).pipe(
        catchError(error => {
            // Añadido: loguear el error para depuración
            console.error('Error HTTP interceptado:', error);

            if (error.status === 401) {
                // Si el error es 401 (Unauthorized), intentar refrescar el token
                if (!isAuthRequest(req.url)) {
                    return authService.refreshToken().pipe(
                        switchMap(token => {
                            if (!token) {
                                authService.logout();
                                return throwError(() => new Error('Sesión expirada'));
                            }
                            // Reintentar con el nuevo token
                            const authReq = req.clone({
                                setHeaders: {
                                    Authorization: `Bearer ${token}`
                                }
                            });
                            return next(authReq);
                        }),
                        catchError(err => {
                            console.error('Error al refrescar token:', err);
                            authService.logout();
                            return throwError(() => new Error('Error al refrescar token'));
                        })
                    );
                }
            }

            // Mostrar mensaje de error para otros errores
            let errorMessage = 'Ha ocurrido un error';

            if (error.error instanceof ErrorEvent) {
                errorMessage = `Error: ${error.error.message}`;
            } else {
                if (error.status === 0) {
                    errorMessage = 'No se pudo conectar con el servidor';
                } else if (error.status === 403) {
                    errorMessage = 'Acceso denegado. No tiene permisos para esta acción.';
                } else if (error.status === 404) {
                    errorMessage = 'Recurso no encontrado';
                } else if (error.status === 500) {
                    errorMessage = 'Error en el servidor';
                } else if (error.error && typeof error.error === 'object') {
                    // Intentar obtener detalles del error del backend
                    errorMessage = getServerErrorMessage(error.error) || errorMessage;
                }
            }

            // No mostrar error 401 porque ya se maneja arriba
            if (error.status !== 401) {
                snackBar.open(errorMessage, 'Cerrar', {
                    duration: 5000,
                    horizontalPosition: 'center',
                    verticalPosition: 'bottom',
                    panelClass: ['error-snackbar']
                });
            }

            return throwError(() => error);
        })
    );
};

// Funciones auxiliares
function isAuthRequest(url: string): boolean {
    // Modificado: Usar las rutas correctas del backend Node.js para autenticación
    const authUrls = [
        `${environment.apiUrl}token/`,
        `${environment.apiUrl}token/refresh/`
    ];
    return authUrls.some(authUrl => url.includes(authUrl));
}

function getServerErrorMessage(error: any): string | null {
    // Modificado: Adaptarse al formato de error del backend Node.js
    // Si hay un mensaje de error directo
    if (error.message && typeof error.message === 'string') {
        return error.message;
    }

    // Revisar si hay un mensaje de error en formato detail
    if (error.detail && typeof error.detail === 'string') {
        return error.detail;
    }

    // Si hay errores en formato array desde express-validator
    if (error.errors && Array.isArray(error.errors)) {
        return error.errors.map((err: any) => err.msg).join(', ');
    }

    // Revisar si hay errores en formato de campo
    if (typeof error === 'object') {
        const errorMessages: string[] = [];

        Object.keys(error).forEach(key => {
            const value = error[key];
            if (Array.isArray(value)) {
                errorMessages.push(`${key}: ${value.join(', ')}`);
            } else if (typeof value === 'string') {
                errorMessages.push(`${key}: ${value}`);
            }
        });

        if (errorMessages.length > 0) {
            return errorMessages.join('. ');
        }
    }

    return null;
}