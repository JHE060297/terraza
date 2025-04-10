import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private snackBar: MatSnackBar) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage = 'Ha ocurrido un error';

                // Intentar obtener mensaje de error más específico
                if (error.error instanceof ErrorEvent) {
                    // Error del lado del cliente
                    errorMessage = `Error: ${error.error.message}`;
                } else {
                    // Error del servidor
                    if (error.status === 0) {
                        errorMessage = 'No se pudo conectar con el servidor';
                    } else if (error.status === 401) {
                        errorMessage = 'No autorizado. Por favor, inicie sesión de nuevo.';
                    } else if (error.status === 403) {
                        errorMessage = 'Acceso denegado. No tiene permisos para esta acción.';
                    } else if (error.status === 404) {
                        errorMessage = 'Recurso no encontrado';
                    } else if (error.status === 500) {
                        errorMessage = 'Error en el servidor';
                    } else if (error.error && typeof error.error === 'object') {
                        // Intentar obtener detalles del error del backend
                        const serverError = this.getServerErrorMessage(error.error);
                        if (serverError) {
                            errorMessage = serverError;
                        }
                    }
                }

                // Mostrar mensaje de error (excepto para errores 401 que se manejan en el auth interceptor)
                if (error.status !== 401) {
                    this.snackBar.open(errorMessage, 'Cerrar', {
                        duration: 5000,
                        horizontalPosition: 'center',
                        verticalPosition: 'bottom',
                        panelClass: ['error-snackbar']
                    });
                }

                return throwError(() => error);
            })
        );
    }

    private getServerErrorMessage(error: any): string | null {
        // Revisar si hay un mensaje de error en formato detail
        if (error.detail && typeof error.detail === 'string') {
            return error.detail;
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
}