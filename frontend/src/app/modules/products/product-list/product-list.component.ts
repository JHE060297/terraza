import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventoryService } from '../../../core/services/inventory.service';
import { Producto } from '../../../core/models/inventory.model';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { sharedImports } from '../../../shared/shared.imports';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
    dataSource = new MatTableDataSource<Producto>([]);
    displayedColumns: string[] = ['id_producto', 'image', 'nombre_producto', 'precio_compra', 'precio_venta', 'is_active', 'actions'];
    isLoading = true;
    error = '';
    showInactiveProducts = false;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private inventoryService: InventoryService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadProducts();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadProducts() {
        this.isLoading = true;
        this.inventoryService.getProducts({ is_active: this.showInactiveProducts ? null : true })
            .subscribe({
                next: (products) => {
                    this.dataSource.data = products;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar productos';
                    console.error('Error loading products', error);
                    this.isLoading = false;
                }
            });
    }

    toggleInactiveProducts() {
        this.showInactiveProducts = !this.showInactiveProducts;
        this.loadProducts();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    addProduct() {
        this.router.navigate(['/products/new']);
    }

    editProduct(product: Producto) {
        this.router.navigate(['/products/edit', product.id_producto]);
    }

    deleteProduct(product: Producto) {
        const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Confirmar eliminación',
                message: `¿Está seguro de eliminar el producto ${product.nombre_producto}?`,
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                color: 'warn'
            }
        });

        confirmDialog.afterClosed().subscribe(result => {
            if (result) {
                this.inventoryService.deleteProduct(product.id_producto).subscribe({
                    next: () => {
                        this.dataSource.data = this.dataSource.data.filter(p => p.id_producto !== product.id_producto);
                        this.snackBar.open('Producto eliminado exitosamente', 'Cerrar', {
                            duration: 3000
                        });
                    },
                    error: (error) => {
                        this.snackBar.open('Error al eliminar producto', 'Cerrar', {
                            duration: 3000
                        });
                        console.error('Error deleting product', error);
                    }
                });
            }
        });
    }

    toggleProductActive(product: Producto) {
        this.inventoryService.toggleProductActive(product.id_producto).subscribe({
            next: () => {
                // Actualizar el estado del producto en la lista
                product.is_active = !product.is_active;
                this.snackBar.open(
                    `Producto ${product.is_active ? 'activado' : 'desactivado'} exitosamente`,
                    'Cerrar',
                    { duration: 3000 }
                );
            },
            error: (error) => {
                this.snackBar.open('Error al cambiar estado del producto', 'Cerrar', {
                    duration: 3000
                });
                console.error('Error toggling product status', error);
            }
        });
    }

    getPriceClass(compra: number, venta: number): string {
        const margin = venta - compra;
        const marginPercentage = (margin / compra) * 100;

        if (marginPercentage >= 30) return 'price-high-margin';
        if (marginPercentage >= 15) return 'price-medium-margin';
        return 'price-low-margin';
    }

    placeholderImage = 'assets/images/placeholder.png';
    getImageUrl(product: Producto): string {
        if (!product.image) {
            return this.placeholderImage; // Retorna una imagen de placeholder si no hay imagen
        }

        // Si ya es una URL completa
        if (product.image.startsWith('http')) {
            return product.image;
        }

        // Si es una ruta relativa desde el backend
        return environment.mediaUrl + product.image;
    }
}