import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Pago } from '../../../core/models/orders.model';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-payments-list',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './payments-list.component.html',
    styleUrls: ['./payments-list.component.scss']
})
export class PaymentsListComponent implements OnInit {
    dataSource = new MatTableDataSource<Pago>([]);
    displayedColumns: string[] = ['id_pago', 'id_pedido', 'monto', 'metodo_pago', 'fecha_hora', 'actions'];
    isLoading = true;
    error = '';

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private ordersService: OrdersService,
        public authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadPayments();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadPayments() {
        this.isLoading = true;
        this.ordersService.getPayments().subscribe(
            (payments) => {
                this.dataSource.data = payments;
                this.isLoading = false;
            },
            (error) => {
                this.error = 'Error al cargar pagos';
                console.error('Error loading payments', error);
                this.isLoading = false;
            }
        );
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    viewPaymentDetails(payment: Pago) {
        // Ver detalles del pago
        this.router.navigate(['/orders', payment.id_pedido]);
    }

    getPaymentMethodLabel(method: string): string {
        switch (method) {
            case 'efectivo': return 'Efectivo';
            case 'tarjeta': return 'Tarjeta';
            case 'nequi': return 'Nequi';
            case 'daviplata': return 'Daviplata';
            default: return method;
        }
    }
}