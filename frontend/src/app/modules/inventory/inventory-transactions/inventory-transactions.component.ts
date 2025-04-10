import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { InventoryService } from '../../../core/services/inventory.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { TransaccionInventario } from '../../../core/models/inventory.model';
import { Sucursal } from '../../../core/models/user.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-inventory-transactions',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './inventory-transactions.component.html',
    styleUrls: ['./inventory-transactions.component.scss']
})
export class InventoryTransactionsComponent implements OnInit {
    dataSource = new MatTableDataSource<TransaccionInventario>([]);
    displayedColumns: string[] = [
        'id_transaccion',
        'transaccion_fecha_hora',
        'producto',
        'sucursal',
        'tipo_transaccion',
        'cantidad',
        'usuario',
    ];
    isLoading = true;
    error = '';
    branches: Sucursal[] = [];
    isAdmin = false;
    filterForm: FormGroup;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private inventoryService: InventoryService,
        private sucursalService: SucursalService,
        private authService: AuthService,
        private fb: FormBuilder
    ) {
        this.filterForm = this.createFilterForm();
    }

    ngOnInit(): void {
        // Verificar roles
        this.isAdmin = this.authService.isAdmin();

        // Obtener sucursales y usuario actual
        forkJoin({
            branches: this.isAdmin ? this.sucursalService.getBranches().pipe(
                catchError(() => of([]))
            ) : of([]),
            currentUser: of(this.authService.currentUserSubject.value)
        }).subscribe(result => {
            this.branches = result.branches;

            if (result.currentUser) {
                // Si no es admin, forzar filtro por sucursal del usuario
                if (!this.isAdmin) {
                    this.filterForm.get('sucursal')?.setValue(result.currentUser.id_sucursal);
                    this.filterForm.get('sucursal')?.disable();
                }
            }

            this.loadTransactions();
        });
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    createFilterForm(): FormGroup {
        return this.fb.group({
            sucursal: [null],
            tipo_transaccion: [null],
            fecha_inicio: [null],
            fecha_fin: [null]
        });
    }

    loadTransactions() {
        this.isLoading = true;
        const filters: any = {};

        // Aplicar filtros
        const formValue = this.filterForm.getRawValue(); // obtiene el valor incluso de campos deshabilitados

        if (formValue.sucursal) {
            filters.id_sucursal = formValue.sucursal;
        }

        if (formValue.tipo_transaccion) {
            filters.tipo_transaccion = formValue.tipo_transaccion;
        }

        if (formValue.fecha_inicio) {
            filters.transaccion_fecha_hora__gte = this.formatDate(formValue.fecha_inicio);
        }

        if (formValue.fecha_fin) {
            filters.transaccion_fecha_hora__lte = this.formatDate(formValue.fecha_fin);
        }

        this.inventoryService.getTransactions(filters)
            .subscribe({
                next: (transactions) => {
                    this.dataSource.data = transactions;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar transacciones';
                    console.error('Error loading transactions', error);
                    this.isLoading = false;
                }
            });
    }

    formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    resetFilters() {
        // Reiniciar todos los filtros excepto sucursal para no-admin
        if (this.isAdmin) {
            this.filterForm.reset();
        } else {
            const branchId = this.filterForm.get('sucursal')?.value;
            this.filterForm.reset({ sucursal: branchId });
            this.filterForm.get('sucursal')?.disable();
        }
        this.loadTransactions();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    getTransactionTypeClass(type: string): string {
        switch (type) {
            case 'compra': return 'transaction-purchase';
            case 'venta': return 'transaction-sale';
            case 'ajuste': return 'transaction-adjustment';
            case 'transferencia': return 'transaction-transfer';
            default: return '';
        }
    }

    getTransactionTypeLabel(type: string): string {
        switch (type) {
            case 'compra': return 'Compra';
            case 'venta': return 'Venta';
            case 'ajuste': return 'Ajuste';
            case 'transferencia': return 'Transferencia';
            default: return type;
        }
    }
}