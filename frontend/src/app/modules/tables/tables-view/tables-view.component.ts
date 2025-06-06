import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SucursalService } from '../../../core/services/sucursales.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Sucursal } from '../../../core/models/user.model';
import { Mesa, Pedido } from '../../../core/models/orders.model';
import { OrdersService } from '../../../core/services/orders.service';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, interval, Subscription } from 'rxjs';
import { catchError, finalize, startWith, switchMap, map } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-tables-view',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './tables-view.component.html',
    styleUrls: ['./tables-view.component.scss']
})
export class TablesViewComponent implements OnInit, OnDestroy {
    tables: Mesa[] = [];
    branches: Sucursal[] = [];
    selectedBranchId: number | null = null;
    isLoading = false;
    error = '';
    isAdmin = false;
    userBranchId: number | null = null;
    tableOrders: { [tableId: number]: Pedido[] } = {};

    // Filtros
    statusFilter: string | null = null; // 'libre', 'ocupada', 'pagado'
    showInactiveTables = false;

    private refreshSubscription: Subscription | null = null;

    constructor(
        private sucursalesServices: SucursalService,
        private ordersService: OrdersService,
        public authService: AuthService,
        private userService: UserService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Verificar si el usuario es admin
        this.isAdmin = this.authService.isAdmin();

        // Obtener el ID de la sucursal del usuario actual si no es admin
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.userBranchId = user.id_sucursal;
                this.selectedBranchId = user.id_sucursal;

                this.loadInitialDate();
            }
        });
    }

    ngOnDestroy(): void {
        // Limpiar la suscripción al salir del componente
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
    }

    loadInitialDate(): void {

        // Cargar datos iniciales
        this.isLoading = true;

        // Observable para sucursales (solo para admin)
        const branches$ = this.isAdmin
            ? this.sucursalesServices.getBranches().pipe(
                catchError(() => {
                    this.error = 'Error al cargar sucursales';
                    return of([]);
                })
            )
            : of([]);

        // Cargar datos en paralelo
        forkJoin({
            branches: branches$,
        }).pipe(
            finalize(() => {
                this.loadData();
            })
        ).subscribe(result => {
            if (this.isAdmin) {
                this.branches = result.branches;
            }
        })
    }

    startAutoRefresh(): void {
        // Cancelar cualquier suscripción existente
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }

        // Crear un intervalo de 30 segundos, empezando inmediatamente
        this.refreshSubscription = interval(30000)
            .pipe(
                startWith(0), // Emite inmediatamente al principio
                switchMap(() => {
                    this.isLoading = true;
                    return this.loadDataObservable();
                })
            )
            .subscribe(
                result => {
                    this.tables = result.tables;
                    this.loadCurrentOrders();
                    this.isLoading = false;
                },
                error => {
                    this.error = 'Error al cargar datos';
                    this.isLoading = false;
                }
            );
    }

    loadDataObservable(): Observable<any> {
        // Observable para mesas según la sucursal seleccionada
        const filters: any = {};

        // Aplicar filtro de sucursal
        if (this.selectedBranchId) {
            filters.id_sucursal = this.selectedBranchId;
        }

        // Aplicar filtro de estado
        if (this.statusFilter) {
            filters.estado = this.statusFilter;
        }

        // Aplicar filtro de mesas activas/inactivas
        if (!this.showInactiveTables) {
            filters.is_active = true;
        }

        return this.sucursalesServices.getTables(filters).pipe(
            catchError((error) => {
                this.error = 'Error al cargar mesas';
                console.error('Error loading tables', error);
                return of([]);
            }),
            map(tables => ({ tables }))
        );
    }


    loadData(): void {
        this.startAutoRefresh();
    }

    loadCurrentOrders(): void {
        // Obtener los pedidos pendientes para cada mesa
        for (const table of this.tables) {
            if (table.estado === 'ocupada') {
                this.ordersService.getOrdersByTable(table.id_mesa)
                    .pipe(
                        catchError(() => of([]))
                    )
                    .subscribe(orders => {
                        // Filtrar solo pedidos pendientes o entregados (no pagados)
                        const activeOrders = orders.filter(order =>
                            order.estado === 'pendiente' || order.estado === 'entregado'
                        );
                        this.tableOrders[table.id_mesa] = activeOrders;
                    });
            } else {
                delete this.tableOrders[table.id_mesa];
            }
        }
    }

    onBranchChange(): void {
        // Detener y reiniciar el intervalo de actualización
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
        this.loadData();
    }

    onStatusFilterChange(): void {
        // Detener y reiniciar el intervalo de actualización
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
        this.loadData();
    }

    toggleInactiveTables(): void {
        this.showInactiveTables = !this.showInactiveTables;
        // Detener y reiniciar el intervalo de actualización
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
        this.loadData();
    }

    getTableStatusClass(status: string): string {
        switch (status) {
            case 'libre': return 'status-free';
            case 'ocupada': return 'status-occupied';
            case 'pagado': return 'status-paid';
            default: return '';
        }
    }

    getTableStatusLabel(status: string): string {
        switch (status) {
            case 'libre': return 'Libre';
            case 'ocupada': return 'Ocupada';
            case 'pagado': return 'Pagado';
            default: return status;
        }
    }

    hasActiveOrders(tableId: number): boolean {
        return this.tableOrders[tableId] && this.tableOrders[tableId].length > 0;
    }

    viewTableDetail(table: Mesa): void {
        this.router.navigate(['/tables', table.id_mesa]);
    }

    createOrder(table: Mesa): void {
        if (table.estado !== 'libre') {
            this.snackBar.open('Esta mesa ya tiene un pedido activo', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Redirigir a la creación de pedido para esta mesa
        this.router.navigate(['/orders/new'], { queryParams: { tableId: table.id_mesa } });
    }

    freeTable(table: Mesa): void {
        // Solo cajeros y admin pueden liberar mesas
        if (!this.authService.isAdmin() && !this.authService.isCajero()) {
            this.snackBar.open('No tienes permisos para liberar mesas', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        if (table.estado === 'libre') {
            this.snackBar.open('Esta mesa ya está libre', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Verificar si hay pedidos sin pagar
        if (this.hasActiveOrders(table.id_mesa)) {
            this.snackBar.open('Esta mesa tiene pedidos pendientes', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Mostrar diálogo de confirmación
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Liberar Mesa',
                message: `¿Está seguro de liberar la mesa ${table.numero}?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.sucursalesServices.freeTable(table.id_mesa)
                    .subscribe(
                        () => {
                            // Actualizar el estado de la mesa en la lista
                            table.estado = 'libre';
                            this.snackBar.open('Mesa liberada exitosamente', 'Cerrar', {
                                duration: 3000
                            });
                        },
                        error => {
                            console.error('Error freeing table', error);
                            this.snackBar.open('Error al liberar la mesa', 'Cerrar', {
                                duration: 3000
                            });
                        }
                    );
            }
        });
    }

    processPayment(table: Mesa): void {
        // Solo cajeros y admin pueden procesar pagos
        if (!this.authService.isAdmin() && !this.authService.isCajero()) {
            this.snackBar.open('No tienes permisos para procesar pagos', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        if (table.estado !== 'ocupada') {
            this.snackBar.open('Esta mesa no tiene pedidos activos', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Verificar si hay pedidos activos
        if (!this.hasActiveOrders(table.id_mesa)) {
            this.snackBar.open('No hay pedidos para procesar', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Redirigir a la pantalla de pago con los pedidos de esta mesa
        const orderId = this.tableOrders[table.id_mesa][0].id_pedido;
        this.router.navigate(['/payments/new'], { queryParams: { orderId } });
    }
}
