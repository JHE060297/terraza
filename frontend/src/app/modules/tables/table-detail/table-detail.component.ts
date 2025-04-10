import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SucursalService } from '../../../core/services/sucursales.service';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Mesa } from '../../../core/models/orders.model';
import { Pedido } from '../../../core/models/orders.model';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
    selector: 'app-table-detail',
    imports: [sharedImports],
    templateUrl: './table-detail.component.html',
    styleUrls: ['./table-detail.component.scss']
})
export class TableDetailComponent implements OnInit {
    tableId: number;
    table: Mesa | null = null;
    orders: Pedido[] = [];
    pendingOrders: Pedido[] = [];
    completedOrders: Pedido[] = [];
    isLoading = true;
    error = '';
    isAdmin = false;
    isCajero = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sucursalesService: SucursalService,
        private ordersService: OrdersService,
        public authService: AuthService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.router.navigate(['/tables']);
            throw new Error('Table ID is required');
        }
        this.tableId = +idParam;
    }

    ngOnInit(): void {
        // Verificar roles del usuario
        this.isAdmin = this.authService.isAdmin();
        this.isCajero = this.authService.isCajero();

        // Cargar datos
        this.loadTableData();
    }

    loadTableData(): void {
        this.isLoading = true;
        this.error = '';

        // Cargar información de la mesa y sus pedidos en paralelo
        forkJoin({
            table: this.sucursalesService.getTableById(this.tableId).pipe(
                catchError(error => {
                    this.error = 'Error al cargar los datos de la mesa';
                    console.error('Error loading table', error);
                    return of(null);
                })
            ),
            orders: this.ordersService.getOrdersByTable(this.tableId).pipe(
                catchError(error => {
                    console.error('Error loading orders', error);
                    return of([]);
                })
            )
        })
            .pipe(
                finalize(() => this.isLoading = false)
            )
            .subscribe(result => {
                this.table = result.table;
                this.orders = result.orders;

                // Clasificar pedidos
                this.pendingOrders = this.orders.filter(order =>
                    order.estado === 'pendiente' || order.estado === 'entregado'
                );

                this.completedOrders = this.orders.filter(order =>
                    order.estado === 'pagado'
                );
            });
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

    getOrderStatusClass(status: string): string {
        switch (status) {
            case 'pendiente': return 'status-pending';
            case 'entregado': return 'status-delivered';
            case 'pagado': return 'status-paid';
            default: return '';
        }
    }

    getOrderStatusLabel(status: string): string {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'entregado': return 'Entregado';
            case 'pagado': return 'Pagado';
            default: return status;
        }
    }

    goBack(): void {
        this.router.navigate(['/tables']);
    }

    createOrder(): void {
        if (!this.table) return;

        if (this.table.estado !== 'libre') {
            this.snackBar.open('Esta mesa ya tiene un pedido activo', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Redirigir a la creación de pedido para esta mesa
        this.router.navigate(['/orders/new'], { queryParams: { tableId: this.tableId } });
    }

    viewOrderDetails(order: Pedido): void {
        this.router.navigate(['/orders', order.id_pedido]);
    }

    processPayment(order: Pedido): void {
        // Solo cajeros y admin pueden procesar pagos
        if (!this.isAdmin && !this.isCajero) {
            this.snackBar.open('No tienes permisos para procesar pagos', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        if (order.estado === 'pagado') {
            this.snackBar.open('Este pedido ya fue pagado', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Redirigir a la pantalla de pago
        this.router.navigate(['/payments/new'], { queryParams: { orderId: order.id_pedido } });
    }

    freeTable(): void {
        if (!this.table) return;

        // Solo cajeros y admin pueden liberar mesas
        if (!this.isAdmin && !this.isCajero) {
            this.snackBar.open('No tienes permisos para liberar mesas', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        if (this.table.estado === 'libre') {
            this.snackBar.open('Esta mesa ya está libre', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Verificar si hay pedidos sin pagar
        if (this.pendingOrders.length > 0) {
            this.snackBar.open('Esta mesa tiene pedidos pendientes', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // Mostrar diálogo de confirmación
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Liberar Mesa',
                message: `¿Está seguro de liberar la mesa ${this.table.numero}?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.sucursalesService.freeTable(this.tableId)
                    .subscribe(
                        () => {
                            if (this.table) {
                                this.table.estado = 'libre';
                            }
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
}

// Dialog Component for Confirmation
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-confirm-dialog',
    imports: [sharedImports],
    template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Confirmar</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { title: string, message: string }) { }
}