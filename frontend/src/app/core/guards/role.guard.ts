import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../authentication/auth.service';

export const roleGuard = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Si el usuario es admin, siempre permitir acceso
    if (authService.isAdmin()) {
        return true;
    }

    // Verificar roles específicos
    const requiredRoles = route.data['roles'] as string[];

    if (!requiredRoles || requiredRoles.length === 0) {
        return true; // Si no hay roles específicos, permitir acceso
    }

    // Verificar si el usuario tiene al menos uno de los roles requeridos
    const hasRequiredRole = requiredRoles.some(role => {
        if (role === 'cajero') return authService.isCajero();
        if (role === 'mesero') return authService.isMesero();
        return false;
    });

    if (hasRequiredRole) {
        return true;
    }

    // Redirigir a página de acceso denegado
    return router.createUrlTree(['/access-denied']);
};