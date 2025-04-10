import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/authentication/auth.service';
import { Usuario } from '../../core/models/user.model';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators'
import { sharedImports } from '../../shared/shared.imports';

interface MenuOption {
    name: string;
    route: string;
    icon: string;
    roles: string[];
}

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
    currentUser$: Observable<Usuario | null>;
    isSidenavOpen = true;
    showNavbar = true;
    isLoginPage = false;

    menuOptions: MenuOption[] = [
        { name: 'Dashboard', route: '/dashboard', icon: 'dashboard', roles: ['administrador', 'cajero', 'mesero'] },
        { name: 'Mesas', route: '/tables', icon: 'table_restaurant', roles: ['administrador', 'cajero', 'mesero'] },
        { name: 'Pedidos', route: '/orders', icon: 'receipt_long', roles: ['administrador', 'cajero', 'mesero'] },
        { name: 'Inventario', route: '/inventory', icon: 'inventory', roles: ['administrador', 'cajero', 'mesero'] },
        { name: 'Productos', route: '/products', icon: 'shopping_basket', roles: ['administrador', 'cajero'] },
        { name: 'Pagos', route: '/payments', icon: 'payments', roles: ['administrador', 'cajero'] },
        { name: 'Reportes', route: '/reports', icon: 'assessment', roles: ['administrador', 'cajero'] },
        { name: 'Usuarios', route: '/users', icon: 'people', roles: ['administrador'] },
        { name: 'Sucursales', route: '/branches', icon: 'store', roles: ['administrador'] }
    ];

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        this.currentUser$ = this.authService.currentUser$;

        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            // Verificar si la ruta actual es la página de login o access-denied
            this.isLoginPage = event.url === '/login' || event.url === '/access-denied' || event.url === '/not-found';
            this.showNavbar = !this.isLoginPage;
        })
    }

    ngOnInit(): void {
        // Verificar la ruta inicial
        this.isLoginPage = this.router.url === '/login' || this.router.url === '/access-denied' || this.router.url === '/not-found';
        this.showNavbar = !this.isLoginPage;
    }

    toggleSidenav(): void {
        this.isSidenavOpen = !this.isSidenavOpen;
    }

    logout(): void {
        this.authService.logout();
    }

    hasRoleForOption(option: MenuOption): boolean {

        const hasRole = option.roles.some(role => {
            if (role === 'administrador') return this.authService.isAdmin();
            if (role === 'cajero') return this.authService.isCajero();
            if (role === 'mesero') return this.authService.isMesero();
            return false;
        });

        return hasRole;
    }
}