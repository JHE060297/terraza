import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../authentication/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

// Auth interceptor como función
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    // No interceptar solicitudes de autenticación
    if (isAuthRequest(req.url)) {
        return next(req);
    }

    const token = authService.getToken();
    if (token) {
        // Modificado: usar el prefijo del token correcto según el backend (Bearer)
        const authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(authReq);
    }

    return next(req);
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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Obtener el token del localStorage
        const token = localStorage.getItem('token');

        // Si hay un token, agregarlo al header de la solicitud
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request);
    }
}