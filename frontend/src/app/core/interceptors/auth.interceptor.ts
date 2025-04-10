import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { AuthService } from '../authentication/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    constructor(private authService: AuthService) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

        // No interceptar solicitudes de autenticación
        if (this.isAuthRequest(request)) {
            return next.handle(request);
        }

        const token = this.authService.getToken();

        // Agregar token a la solicitud si existe
        if (token) {
            request = this.addTokenToRequest(request, token);
        } else {
            console.warn('⚠️ No hay token disponible para autorizar esta solicitud');
        }

        // Manejar la solicitud con la lógica de refresh token
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // Si el error es 401 (Unauthorized), intentar refrescar el token
                if (error.status === 401) {
                    if (this.refreshTokenInProgress) {
                        // Si ya hay un refresh en progreso, esperar a que termine y reintentar
                        return this.refreshTokenSubject.pipe(
                            filter(token => token !== null),
                            take(1),
                            switchMap(token => {
                                return next.handle(this.addTokenToRequest(request, token!));
                            })
                        );
                    } else {
                        // Iniciar proceso de refresh
                        this.refreshTokenInProgress = true;
                        this.refreshTokenSubject.next(null);

                        return this.authService.refreshToken().pipe(
                            switchMap(token => {
                                this.refreshTokenInProgress = false;
                                this.refreshTokenSubject.next(token);

                                if (!token || token.trim() === '') {
                                    this.authService.logout();
                                    return throwError(() => new Error('Sesión expirada'));
                                }

                                // Reintentar con el nuevo token
                                return next.handle(this.addTokenToRequest(request, token));
                            }),
                            catchError(err => {
                                this.refreshTokenInProgress = false;
                                this.authService.logout();
                                return throwError(() => new Error('Error al refrescar token'));
                            }),
                            finalize(() => {
                                this.refreshTokenInProgress = false;
                            })
                        );
                    }
                }

                // Para otros errores, simplemente reenviarlos
                return throwError(() => error);
            })
        );
    }

    private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
        const authHeader = `Bearer ${token}`;

        const clonedRequest = request.clone({
            setHeaders: {
                Authorization: authHeader
            }
        });

        return clonedRequest;
    }

    private isAuthRequest(request: HttpRequest<any>): boolean {
        const authUrls = [
            `${environment.apiUrl}token/`,
            `${environment.apiUrl}token/refresh/`
        ];

        // Comprobación exacta para evitar falsos positivos
        return authUrls.some(url => request.url === url);
    }
}