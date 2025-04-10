import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './core/authentication/auth.service';
import { InventoryService } from './core/services/inventory.service';
import { LowStockAlertDialogComponent } from './shared/components/low-stock-alert-dialog/low-stock-alert-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class AppInitService {

    constructor(
        private authService: AuthService,
        private inventoryService: InventoryService,
        private dialog: MatDialog,
        private router: Router
    ) { }

    /**
     * Inicialización de la aplicación
     * - Verificar si hay productos con bajo stock
     * - Mostrar alertas si es necesario
     */
    initializeApp(): Promise<any> {
        return new Promise((resolve) => {
            // Solo realizar estas comprobaciones si el usuario está autenticado
            if (this.authService.isAuthenticated()) {
                // Verificar si el usuario es admin o cajero
                if (this.authService.isAdmin() || this.authService.isCajero()) {
                    this.checkLowStockItems();
                }
            }

            // Resolver la promesa para permitir que la aplicación continúe cargando
            resolve(true);
        });
    }

    /**
     * Verificar productos con bajo stock
     */
    private checkLowStockItems(): void {
        const currentUser = this.authService.currentUserSubject.value;
        if (!currentUser) return;

        const filters: any = { is_low_stock: true };

        // Si no es admin, filtrar por sucursal
        if (!this.authService.isAdmin()) {
            filters.sucursal = currentUser.id_sucursal;
        }

        this.inventoryService.getInventory(filters).subscribe({
            next: (items) => {
                if (items.length > 0) {
                    this.showLowStockAlert(items);
                }
            },
            error: (error) => {
                console.error('Error al verificar productos con bajo stock', error);
            }
        });
    }

    /**
     * Mostrar alerta de productos con bajo stock
     */
    private showLowStockAlert(items: any[]): void {
        const dialogRef = this.dialog.open(LowStockAlertDialogComponent, {
            width: '500px',
            data: { items }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Si el usuario hace clic en "Ver Inventario", navegar a la página de inventario
                this.router.navigate(['/inventory']);
            }
        });
    }
}