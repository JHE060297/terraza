import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/authentication/auth.service';
import { SucursalService } from '../../core/services/sucursales.service';
import { InventoryService } from '../../core/services/inventory.service';
import { Usuario } from '../../core/models/user.model';
import { LowStockWidgetComponent } from './widget/low-stock-widget/low-stock-widget.component';
import { sharedImports } from '../../shared/shared.imports';
import { forkJoin, of, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { OrdersService } from '../../core/services/orders.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
    private subscriptions: Subscription[] = [];
    currentUser: Usuario | null = null;
    isAdmin = false;
    isCajero = false;
    isMesero = false;

    isLoading = false;

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
        private inventoryService: InventoryService,
        private ordersService: OrdersService
    ) { }

    ngOnInit(): void {
        // Guardar referencia a la suscripción
        const userSub = this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;

            // Solo cargar datos si hay un usuario autenticado
            if (user) {
                // Verificar roles
                this.isAdmin = this.authService.isAdmin();
                this.isCajero = this.authService.isCajero();
                this.isMesero = this.authService.isMesero();

                // Cargar datos según el rol
                this.loadDashboardData();
            }
        });

        this.subscriptions.push(userSub);
    }

    ngOnDestroy(): void {
        // Limpiar todas las suscripciones al destruir el componente
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    loadDashboardData(): void {

        if (!this.authService.isAuthenticated()) {
            return;
        }

        this.isLoading = true;


        // datos de muestra para pedidos y ventas
        this.dashboardCards.pendingOrders = 5;

        const pendingOrders$ = this.ordersService.getPendingOrders().pipe(
            catchError(error => {
                console.error('Error cargando pedidos pendientes:', error);
                return of([]);
            })
        );

        // Observable para ventas del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailySales$ = this.ordersService.getPayments({
            fecha_hora__gte: today.toISOString()
        }).pipe(
            map(payments => {
                // Calcular la suma de todos los pagos del día
                return payments.reduce((total, payment) => total + Number(payment.monto), 0);
            }),
            catchError(error => {
                console.error('Error cargando ventas del día:', error);
                return of(0);
            })
        );

        // Observable para mesas disponibles
        const freeTables$ = this.sucursalService.getTables({
            estado: 'libre',
            is_active: true
        }).pipe(
            catchError(error => {
                console.error('Error cargando mesas disponibles:', error);
                return of([]);
            })
        );

        const filters: any = { is_low_stock: true };

        // Si no es admin, filtrar por sucursal
        if (!this.isAdmin && this.currentUser) {
            filters.id_sucursal = this.currentUser.id_sucursal;
        }

        const lowStockItems$ = this.inventoryService.getInventory(filters).pipe(
            catchError(error => {
                console.error('Error cargando productos con bajo stock:', error);
                return of([]);
            })
        );

        // Combinar todos los observables y actualizar la interfaz
        forkJoin({
            pendingOrders: pendingOrders$,
            dailySales: dailySales$,
            freeTables: freeTables$,
            lowStockItems: lowStockItems$
        }).subscribe(results => {
            // Actualizar las tarjetas del dashboard con datos reales
            this.dashboardCards.pendingOrders = results.pendingOrders.length;
            this.dashboardCards.dailySales = results.dailySales;
            this.dashboardCards.availableTables = results.freeTables.length;
            this.dashboardCards.lowStockItems = results.lowStockItems.length;

            // Finalizar la carga
            this.isLoading = false;
        });
    }
}