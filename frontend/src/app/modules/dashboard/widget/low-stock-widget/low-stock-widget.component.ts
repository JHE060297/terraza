import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';
import { Inventario } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/authentication/auth.service';
import { sharedImports } from '../../../../shared/shared.imports';

@Component({
    selector: 'app-low-stock-widget',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './low-stock-widget.component.html',
    styleUrls: ['./low-stock-widget.component.scss']
})
export class LowStockWidgetComponent implements OnInit {
    @Input() limit: number = 5;
    lowStockItems: Inventario[] = [];
    isLoading = true;
    error = '';
    userBranchId: number | null = null;

    constructor(
        private inventoryService: InventoryService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Obtener ID de sucursal del usuario actual
        const currentUser = this.authService.currentUserSubject.value;
        if (currentUser) {
            this.userBranchId = currentUser.id_sucursal;
        }

        this.loadLowStockItems();
    }

    loadLowStockItems(): void {
        this.isLoading = true;

        // Filtros para la consulta
        const filters: any = { is_low_stock: true };

        // Si no es admin, filtrar por sucursal
        if (!this.authService.isAdmin() && this.userBranchId) {
            filters.sucursal = this.userBranchId;
        }

        this.inventoryService.getInventory(filters)
            .subscribe({
                next: (items) => {
                    // Ordenar por cantidad ascendente y tomar los primeros 'limit'
                    this.lowStockItems = items
                        .sort((a, b) => a.cantidad - b.cantidad)
                        .slice(0, this.limit);
                    this.isLoading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar productos con bajo stock';
                    console.error('Error loading low stock items', error);
                    this.isLoading = false;
                }
            });
    }

    viewInventory(): void {
        this.router.navigate(['/inventory']);
    }
}