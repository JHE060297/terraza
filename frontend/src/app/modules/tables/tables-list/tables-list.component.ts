import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Sucursal } from '../../../core/models/user.model';
import { Mesa } from '../../../core/models/orders.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-tables-list',
    imports: [sharedImports],
    templateUrl: './tables-list.component.html',
    styleUrls: ['./tables-list.component.scss']
})
export class MesasListComponent implements OnInit {
    branchId: number;
    branch: Sucursal | null = null;
    tables: Mesa[] = [];
    isLoading = true;
    error = '';
    showInactiveTables = false;
    isAdmin = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private sucursalService: SucursalService,
        public authService: AuthService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.router.navigate(['/branches']);
            throw new Error('Branch ID is required');
        }
        this.branchId = +idParam;
        this.isAdmin = this.authService.isAdmin();
    }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.isLoading = true;
        this.error = '';

        // Cargar la sucursal y sus mesas en paralelo
        forkJoin({
            branch: this.sucursalService.getBranchById(this.branchId).pipe(
                catchError(error => {
                    this.error = 'Error al cargar la sucursal';
                    console.error('Error loading branch', error);
                    return of(null);
                })
            ),
            tables: this.sucursalService.getTablesByBranch(this.branchId).pipe(
                catchError(error => {
                    console.error('Error loading tables', error);
                    return of([]);
                })
            )
        })
            .pipe(
                finalize(() => this.isLoading = false)
            )
            .subscribe(result => {
                this.branch = result.branch;
                // Filtrar mesas inactivas si es necesario
                this.tables = this.showInactiveTables
                    ? result.tables
                    : result.tables.filter(table => table.is_active);
            });
    }

    toggleInactiveTables(): void {
        this.showInactiveTables = !this.showInactiveTables;
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

    goBack(): void {
        this.router.navigate(['/branches']);
    }

    addTable(): void {
        this.router.navigate(['/branches', this.branchId, 'tables', 'new']);
    }

    editTable(table: Mesa): void {
        this.router.navigate(['/branches', this.branchId, 'tables', 'edit', table.id_mesa]);
    }

    deleteTable(table: Mesa): void {
        const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Confirmar eliminación',
                message: `¿Está seguro de eliminar la mesa ${table.numero}?`
            }
        });

        confirmDialog.afterClosed().subscribe(result => {
            if (result) {
                this.sucursalService.deleteTable(table.id_mesa).subscribe(
                    () => {
                        this.tables = this.tables.filter(t => t.id_mesa !== table.id_mesa);
                        this.snackBar.open('Mesa eliminada exitosamente', 'Cerrar', {
                            duration: 3000
                        });
                    },
                    (error) => {
                        this.snackBar.open('Error al eliminar mesa', 'Cerrar', {
                            duration: 3000
                        });
                        console.error('Error deleting table', error);
                    }
                );
            }
        });
    }

    toggleTableActive(table: Mesa): void {
        const newTable: Partial<Mesa> = {
            is_active: !table.is_active
        };

        this.sucursalService.updateTable(table.id_mesa, newTable).subscribe(
            (updatedTable) => {
                // Actualizar la mesa en la lista
                const index = this.tables.findIndex(t => t.id_mesa === table.id_mesa);
                if (index !== -1) {
                    this.tables[index] = updatedTable;
                }

                const status = updatedTable.is_active ? 'activada' : 'desactivada';
                this.snackBar.open(`Mesa ${status} exitosamente`, 'Cerrar', {
                    duration: 3000
                });
            },
            (error) => {
                this.snackBar.open('Error al cambiar estado de la mesa', 'Cerrar', {
                    duration: 3000
                });
                console.error('Error updating table', error);
            }
        );
    }

    viewTableDetail(table: Mesa): void {
        this.router.navigate(['/tables', table.id_mesa]);
    }
}