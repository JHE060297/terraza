import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/authentication/auth.service';
import { SucursalService } from '../../core/services/sucursales.service';
import { InventoryService } from '../../core/services/inventory.service';
import { Usuario } from '../../core/models/user.model';
import { LowStockWidgetComponent } from './widget/low-stock-widget/low-stock-widget.component';
import { sharedImports } from '../../shared/shared.imports';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [sharedImports, LowStockWidgetComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    currentUser: Usuario | null = null;
    isAdmin = false;
    isCajero = false;
    isMesero = false;

    // Datos para las tarjetas
    dashboardCards = {
        pendingOrders: 0,
        dailySales: 0,
        availableTables: 0,
        lowStockItems: 0
    };

    constructor(
        private authService: AuthService,
        private sucursalService: SucursalService,
        private inventoryService: InventoryService
    ) { }

    ngOnInit(): void {
        // Suscripción al usuario actual
        this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;

            // Verificar roles
            this.isAdmin = this.authService.isAdmin();
            this.isCajero = this.authService.isCajero();
            this.isMesero = this.authService.isMesero();

            // Cargar datos según el rol
            this.loadDashboardData();
        });
    }

    loadDashboardData(): void {
        // datos de muestra para pedidos y ventas
        this.dashboardCards.pendingOrders = 5;
        this.dashboardCards.dailySales = 152000;

        // Cargar mesas disponibles
        this.sucursalService.getTables({ estado: 'libre', is_active: true }).subscribe({
            next: (tables) => {
                this.dashboardCards.availableTables = tables.length;
            },
            error: (error) => {
                console.error('Error cargando mesas disponibles:', error);
            }
        });

        const filters: any = { is_low_stock: true };

        // Si no es admin, filtrar por sucursal
        if (!this.isAdmin && this.currentUser) {
            filters.sucursal = this.currentUser.id_sucursal;
        }

        this.inventoryService.getInventory(filters).subscribe({
            next: (items) => {
                this.dashboardCards.lowStockItems = items.length;
            },
            error: (error) => {
                console.error('Error cargando productos con bajo stock:', error);
            }
        });

    }
}