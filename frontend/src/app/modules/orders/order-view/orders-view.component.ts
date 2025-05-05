import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OrdersService } from '../../../core/services/orders.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Pedido } from '../../../core/models/orders.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-orders-view',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './orders-view.component.html',
    styleUrls: ['./orders-view.component.scss']
})
export class OrdersViewComponent implements OnInit {
    orders: Pedido[] = [];
    filteredOrders: Pedido[] = [];
    isLoading = false;
    error = '';
    statusFilter: string = '';

    constructor(
        private ordersService: OrdersService,
        private sucursalService: SucursalService,
        public authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        this.isLoading = true;
        const filters: any = {};

        // Si el usuario no es admin, filtrar por su sucursal
        const currentUser = this.authService.currentUserSubject.value;
        if (currentUser && !this.authService.isAdmin()) {
            filters.id_mesa__id_sucursal = currentUser.id_sucursal;
        }

        if (this.statusFilter) {
            filters.estado = this.statusFilter;
        }

        this.ordersService.getOrders(filters).subscribe({
            next: (orders) => {
                this.orders = orders;
                this.filterOrders();
                this.isLoading = false;
            },
            error: (error) => {
                this.error = 'Error al cargar los pedidos';
                console.error('Error loading orders', error);
                this.isLoading = false;
                this.snackBar.open('Error al cargar los pedidos', 'Cerrar', {
                    duration: 3000
                });
            }
        });
    }

    filterOrders(): void {
        if (this.statusFilter) {
            this.filteredOrders = this.orders.filter(order => order.estado === this.statusFilter);
        } else {
            this.filteredOrders = [...this.orders];
        }
    }

    createOrder(): void {
        this.router.navigate(['/orders/new']);
    }

    viewOrderDetails(order: Pedido): void {
        this.router.navigate(['/orders', order.id_pedido]);
    }

    processPayment(order: Pedido): void {
        if (!this.authService.isAdmin() && !this.authService.isCajero()) {
            this.snackBar.open('No tienes permisos para procesar pagos', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        if (order.estado === 'pagado') {
            this.snackBar.open('Este pedido ya ha sido pagado', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        this.router.navigate(['/payments/new'], {
            queryParams: { orderId: order.id_pedido }
        });
    }

    changeOrderStatus(order: Pedido, newStatus: string): void {
        if (!this.authService.isAdmin()) {
            this.snackBar.open('No tienes permisos para cambiar el estado', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Cambiar Estado',
                message: `¿Está seguro de cambiar el estado a ${this.getStatusLabel(newStatus)}?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.ordersService.changeOrderStatus(order.id_pedido, newStatus).subscribe({
                    next: () => {
                        order.estado = newStatus as "pagado" | "pendiente" | "entregado";
                        this.snackBar.open('Estado actualizado correctamente', 'Cerrar', {
                            duration: 3000
                        });
                    },
                    error: (error) => {
                        console.error('Error changing order status', error);
                        this.snackBar.open('Error al cambiar el estado', 'Cerrar', {
                            duration: 3000
                        });
                    }
                });
            }
        });
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'entregado': return 'Entregado';
            case 'pagado': return 'Pagado';
            default: return status;
        }
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'pendiente': return 'status-pending';
            case 'entregado': return 'status-delivered';
            case 'pagado': return 'status-paid';
            default: return '';
        }
    }
}