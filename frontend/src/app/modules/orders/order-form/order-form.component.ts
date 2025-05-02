import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OrdersService } from '../../../core/services/orders.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { Mesa, Pedido, DetallePedido } from '../../../core/models/orders.model';
import { Producto } from '../../../core/models/inventory.model';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-order-form',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './order-form.component.html',
    styleUrls: ['./order-form.component.scss']
})
export class OrderFormComponent implements OnInit {
    orderForm: FormGroup;
    availableTables: Mesa[] = [];
    products: Producto[] = [];
    orderDetails: DetallePedido[] = [];
    isLoading = false;
    isSubmitting = false;
    error = '';
    tableId: number | null = null;
    currentOrder: Pedido | null = null;

    constructor(
        private fb: FormBuilder,
        private ordersService: OrdersService,
        private sucursalService: SucursalService,
        private inventoryService: InventoryService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        this.orderForm = this.createForm();
    }

    ngOnInit(): void {
        this.tableId = Number(this.route.snapshot.queryParamMap.get('tableId'));
        if (this.tableId) {
            this.orderForm.get('id_mesa')?.setValue(this.tableId);
            this.loadTableDetails();
        } else {
            this.loadAvailableTables();
        }
        this.loadProducts();
    }

    createForm(): FormGroup {
        return this.fb.group({
            id_mesa: ['', [Validators.required]],
            producto: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            total: [{ value: 0, disabled: true }]
        });
    }

    loadAvailableTables(): void {
        this.isLoading = true;
        const currentUser = this.authService.currentUserSubject.value;
        const filters: any = {
            estado: 'libre',
            is_active: true
        };

        if (currentUser && !this.authService.isAdmin()) {
            filters.id_sucursal = currentUser.id_sucursal;
        }

        this.sucursalService.getTables(filters).subscribe({
            next: (tables) => {
                this.availableTables = tables;
                this.isLoading = false;
            },
            error: (error) => {
                this.error = 'Error al cargar las mesas';
                console.error('Error loading tables', error);
                this.isLoading = false;
            }
        });
    }

    loadTableDetails(): void {
        if (!this.tableId) return;

        this.sucursalService.getTableById(this.tableId).subscribe({
            next: (table) => {
                if (table.estado !== 'libre') {
                    // Si la mesa ya tiene un pedido activo, cargar ese pedido
                    this.loadExistingOrder(table.id_mesa);
                }
            },
            error: (error) => {
                console.error('Error loading table details', error);
            }
        });
    }

    loadExistingOrder(tableId: number): void {
        this.ordersService.getOrdersByTable(tableId).subscribe({
            next: (orders) => {
                const activeOrder = orders.find(o => o.estado !== 'pagado');
                if (activeOrder) {
                    this.currentOrder = activeOrder;
                    this.loadOrderDetails(activeOrder.id_pedido);
                }
            },
            error: (error) => {
                console.error('Error loading existing order', error);
            }
        });
    }

    loadOrderDetails(orderId: number): void {
        this.ordersService.getOrderDetailsByOrder(orderId).subscribe({
            next: (details) => {
                this.orderDetails = details;
                this.updateTotal();
            },
            error: (error) => {
                console.error('Error loading order details', error);
            }
        });
    }

    loadProducts(): void {
        this.inventoryService.getProducts({ is_active: true }).subscribe({
            next: (products) => {
                this.products = products;
            },
            error: (error) => {
                this.error = 'Error al cargar los productos';
                console.error('Error loading products', error);
            }
        });
    }

    addProduct(): void {
        const productId = this.orderForm.get('producto')?.value;
        const cantidad = this.orderForm.get('cantidad')?.value;

        if (!productId || !cantidad) {
            this.snackBar.open('Seleccione un producto y cantidad', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        const product = this.products.find(p => p.id_producto === productId);
        if (!product) return;

        // Verificar si ya existe el producto en los detalles
        const existingDetail = this.orderDetails.find(d => d.id_producto === productId);
        if (existingDetail) {
            existingDetail.cantidad += cantidad;
            existingDetail.subtotal = existingDetail.cantidad * existingDetail.precio_unitario;
        } else {
            const newDetail: Partial<DetallePedido> = {
                id_producto: product.id_producto,
                producto_nombre: product.nombre_producto,
                cantidad: cantidad,
                precio_unitario: Number(product.precio_venta),
                subtotal: cantidad * Number(product.precio_venta)
            };
            this.orderDetails.push(newDetail as DetallePedido);
        }

        this.updateTotal();
        this.orderForm.get('producto')?.reset();
        this.orderForm.get('cantidad')?.setValue(1);
    }

    removeProduct(detail: DetallePedido): void {
        if (detail.id_detalle_pedido) {
            // Si tiene ID, es un detalle existente, necesitamos eliminarlo del servidor
            this.deleteOrderDetail(detail);
        } else {
            // Si no tiene ID, solo lo removemos del array local
            const index = this.orderDetails.indexOf(detail);
            if (index > -1) {
                this.orderDetails.splice(index, 1);
                this.updateTotal();
            }
        }
    }

    deleteOrderDetail(detail: DetallePedido): void {
        if (!detail.id_detalle_pedido) return;

        this.ordersService.deleteOrderDetail(detail.id_detalle_pedido).subscribe({
            next: () => {
                const index = this.orderDetails.indexOf(detail);
                if (index > -1) {
                    this.orderDetails.splice(index, 1);
                    this.updateTotal();
                }
                this.snackBar.open('Producto eliminado del pedido', 'Cerrar', {
                    duration: 3000
                });
            },
            error: (error) => {
                console.error('Error deleting order detail', error);
                this.snackBar.open('Error al eliminar producto', 'Cerrar', {
                    duration: 3000
                });
            }
        });
    }

    updateTotal(): void {
        const total = this.orderDetails.reduce((sum, detail) => sum + (detail.subtotal || 0), 0);
        this.orderForm.get('total')?.setValue(total);
    }

    onSubmit(): void {
        if (this.orderForm.invalid || this.orderDetails.length === 0) {
            this.snackBar.open('Agregue al menos un producto al pedido', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        this.isSubmitting = true;

        if (this.currentOrder) {
            // Actualizar pedido existente (solo agregar nuevos detalles)
            this.addDetailsToExistingOrder();
        } else {
            // Crear nuevo pedido
            this.createNewOrder();
        }
    }

    createNewOrder(): void {
        const orderData = {
            id_mesa: this.orderForm.get('id_mesa')?.value
        };

        this.ordersService.createOrder(orderData).subscribe({
            next: (order) => {
                this.currentOrder = order;
                this.addDetailsToOrder(order.id_pedido);
            },
            error: (error) => {
                this.isSubmitting = false;
                console.error('Error creating order', error);
                this.snackBar.open('Error al crear el pedido', 'Cerrar', {
                    duration: 3000
                });
            }
        });
    }

    addDetailsToExistingOrder(): void {
        const newDetails = this.orderDetails.filter(d => !d.id_detalle_pedido);
        if (newDetails.length === 0) {
            this.router.navigate(['/orders']);
            return;
        }
        this.addDetailsToOrder(this.currentOrder!.id_pedido);
    }

    addDetailsToOrder(orderId: number): void {
        const newDetails = this.orderDetails.filter(d => !d.id_detalle_pedido);
        let detailsAdded = 0;

        if (newDetails.length === 0) {
            this.finalizeOrder();
            return;
        }

        newDetails.forEach(detail => {
            const detailData = {
                id_pedido: orderId,
                id_producto: detail.id_producto,
                cantidad: detail.cantidad
            };

            this.ordersService.createOrderDetail(detailData).subscribe({
                next: () => {
                    detailsAdded++;
                    if (detailsAdded === newDetails.length) {
                        this.finalizeOrder();
                    }
                },
                error: (error) => {
                    this.isSubmitting = false;
                    console.error('Error adding order detail', error);
                    this.snackBar.open('Error al agregar productos', 'Cerrar', {
                        duration: 3000
                    });
                }
            });
        });
    }

    finalizeOrder(): void {
        this.isSubmitting = false;
        this.snackBar.open('Pedido guardado exitosamente', 'Cerrar', {
            duration: 3000
        });
        this.router.navigate(['/orders']);
    }

    cancel(): void {
        this.router.navigate(['/orders']);
    }
}