import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../authentication/auth.service';

export const authGuard = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        // Si tiene roles requeridos, verificar
        const requiredRoles = route.data['roles'] as string[];

        if (requiredRoles && requiredRoles.length > 0) {
            // Verificar si el usuario tiene al menos uno de los roles requeridos
            const hasRequiredRole = requiredRoles.some(role => {
                if (role === 'administrador') return authService.isAdmin();
                if (role === 'cajero') return authService.isCajero();
                if (role === 'mesero') return authService.isMesero();
                return false;
            });

            if (hasRequiredRole) {
                return true;
            } else {
                // Si no tiene los roles requeridos, redirigir a página de acceso denegado
                return router.createUrlTree(['/access-denied']);
            }
        }

        // Si no hay roles requeridos, permitir acceso
        return true;
    }

    // Si no está autenticado, redirigir a login
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};