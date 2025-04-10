import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventoryService } from '../../../core/services/inventory.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Inventario, AjusteInventario } from '../../../core/models/inventory.model';
import { Sucursal } from '../../../core/models/user.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StockAdjustmentDialogComponent } from '../stock-adjustment-dialog/stock-adjustment-dialog.component';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-inventory-stock',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './inventory-stock.component.html',
    styleUrls: ['./inventory-stock.component.scss']
})
export class InventoryStockComponent implements OnInit {
    dataSource = new MatTableDataSource<Inventario>([]);
    displayedColumns: string[] = ['id_inventario', 'producto', 'sucursal', 'cantidad', 'is_low_stock', 'actions'];
    isLoading = true;
    error = '';
    branches: Sucursal[] = [];
    selectedBranchId: number | null = null;
    showLowStockOnly = false;
    isAdmin = false;
    isCajero = false;
    userBranchId: number | null = null;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private inventoryService: InventoryService,
        private sucursalService: SucursalService,
        private authService: AuthService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        // Verificar roles
        this.isAdmin = this.authService.isAdmin();
        this.isCajero = this.authService.isCajero();

        // Obtener sucursales y usuario actual
        forkJoin({
            branches: this.isAdmin ? this.sucursalService.getBranches().pipe(
                catchError(() => of([]))
            ) : of([]),
            currentUser: of(this.authService.currentUserSubject.value)
        }).subscribe(result => {
            this.branches = result.branches;

            if (result.currentUser) {
                this.userBranchId = result.currentUser.id_sucursal;
                // Si es admin, permite seleccionar sucursal; si no, usa la del usuario
                this.selectedBranchId = this.isAdmin ? null : this.userBranchId;
            }

            this.loadInventory();
        });
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadInventory() {
        this.isLoading = true;
        const filters: any = {};

        // Aplicar filtros
        if (this.selectedBranchId) {
            filters.sucursal = this.selectedBranchId;
        }

        // Solo para no admins, forzar filtro por sucursal
        if (!this.isAdmin && this.userBranchId) {
            filters.sucursal = this.userBranchId;
        }

        this.inventoryService.getInventory(filters)
            .subscribe({
                next: (inventory) => {
                    // Si está activado el filtro de bajo stock, aplicarlo
                    if (this.showLowStockOnly) {
                        inventory = inventory.filter(item => item.is_low_stock);
                    }
                    this.dataSource.data = inventory;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar inventario';
                    console.error('Error loading inventory', error);
                    this.isLoading = false;
                }
            });
    }

    onBranchChange() {
        this.loadInventory();
    }

    toggleLowStockOnly() {
        this.showLowStockOnly = !this.showLowStockOnly;
        this.loadInventory();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    openAdjustStockDialog(inventoryItem: Inventario) {
        // Solo admins y cajeros pueden ajustar inventario
        if (!this.isAdmin && !this.isCajero) {
            this.snackBar.open('No tiene permisos para ajustar el inventario', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        const dialogRef = this.dialog.open(StockAdjustmentDialogComponent, {
            width: '400px',
            data: {
                inventoryItem: inventoryItem,
                allowNegative: false // No permitir stock negativo
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Crear un objeto de ajuste con los datos del diálogo
                const adjustment: AjusteInventario = {
                    cantidad: result.cantidad,  // Asegúrate de que este valor sea un número entero
                    tipo_transaccion: result.tipo_transaccion,
                };

                this.inventoryService.adjustInventory(inventoryItem.id_inventario, adjustment)
                    .subscribe({
                        next: (inventory) => {
                            console.log('Datos de inventario recibidos:', inventory);
                            this.snackBar.open('Stock ajustado correctamente', 'Cerrar', {
                                duration: 3000
                            });
                            // Actualizar el stock en la tabla
                            inventoryItem.cantidad = inventory.nueva_cantidad;
                            // Recargar datos para actualizar el estado de bajo stock
                            this.loadInventory();
                        },
                        error: (error) => {
                            // Mostrar el mensaje de error específico del backend si está disponible
                            const errorMessage = error.error && error.error.error
                                ? error.error.error
                                : 'Error al ajustar el stock';

                            this.snackBar.open(errorMessage, 'Cerrar', {
                                duration: 5000
                            });
                            console.error('Error adjusting stock', error);
                        }
                    });
            }
        });
    }

    getStockStatusClass(item: Inventario): string {
        if (item.is_low_stock) return 'low-stock';
        if (item.cantidad > item.alerta * 3) return 'good-stock';
        return 'medium-stock';
    }
}