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
import { Producto, Inventario } from '../../../core/models/inventory.model';
import { sharedImports } from '../../../shared/shared.imports';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

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
    inventoryMap: Map<number, Inventario> = new Map()
    selectedBranchId: number | null = null

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

                this.selectedBranchId = table.id_sucursal;

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
        this.isLoading = true

        this.ordersService.getOrdersByTable(tableId).subscribe({
            next: (orders) => {
                const activeOrders = orders.filter(o => o.estado !== 'pagado');

                if (activeOrders.length > 0) {
                    this.currentOrder = activeOrders[0];


                    this.loadOrderDetails(this.currentOrder.id_pedido);
                    this.snackBar.open(`Editando pedido #${this.currentOrder.id_pedido}`, 'Cerrar', {
                        duration: 3000
                    })
                }
                this.isLoading = false
            },
            error: (error) => {
                console.error('Error loading existing order', error);
                this.isLoading = false
                this.snackBar.open('Error al cargar el pedido existente', 'Cerrar', {
                    duration: 3000
                })
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
        // Obtener la sucursal del usuario actual o la mesa seleccionada
        const currentUser = this.authService.currentUserSubject.value;
        let sucursalId = currentUser?.id_sucursal;

        // Si ya hay una mesa seleccionada, obtener su sucursal
        if (this.tableId) {
            this.sucursalService.getTableById(this.tableId).subscribe({
                next: (table) => {
                    sucursalId = table.id_sucursal;
                    this.loadProductsWithStock(sucursalId);
                },
                error: (error) => {
                    console.error('Error loading table details', error);
                    // Cargar con la sucursal del usuario si falla la mesa
                    this.loadProductsWithStock(sucursalId);
                }
            });
        } else {
            this.loadProductsWithStock(sucursalId);
        }
    }

    loadProductsWithStock(sucursalId: number | undefined): void {
        if (!sucursalId) {
            this.error = 'No se pudo determinar la sucursal';
            return;
        }

        // Primero cargar el inventario con stock disponible
        this.inventoryService.getInventory({ id_sucursal: sucursalId }).subscribe({
            next: (inventory) => {

                inventory.forEach(item => {
                    this.inventoryMap.set(item.id_producto, item);
                })


                // Filtrar solo items con stock positivo
                const itemsWithStock = inventory.filter(item => item.cantidad > 0);

                // Extraer IDs de productos con stock
                const productIdsWithStock = itemsWithStock.map(item => item.id_producto);

                if (productIdsWithStock.length === 0) {
                    this.products = [];
                    this.error = 'No hay productos con stock disponible';
                    return;
                }

                // Cargar solo productos activos que tienen stock
                this.inventoryService.getProducts({ is_active: true }).subscribe({
                    next: (allProducts) => {
                        // Filtrar solo productos que tienen stock
                        this.products = allProducts.filter(product =>
                            productIdsWithStock.includes(product.id_producto)
                        );
                    },
                    error: (error) => {
                        this.error = 'Error al cargar los productos';
                        console.error('Error loading products', error);
                    }
                });
            },
            error: (error) => {
                this.error = 'Error al verificar inventario';
                console.error('Error loading inventory', error);
            }
        });
    }

    hasEnoughStock(productId: number, requestedQuantity: number): boolean {
        const inventoryItem = this.inventoryMap.get(productId)

        if (!inventoryItem || inventoryItem.cantidad < requestedQuantity) {
            return false
        }

        return true
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

        // Check if we need to refresh inventory data first
        if (!this.selectedBranchId) {
            this.snackBar.open('No se pudo determinar la sucursal para verificar el stock', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        // If we don't have inventory data or it might be outdated, refresh it
        if (this.inventoryMap.size === 0) {
            this.isLoading = true;
            this.inventoryService.getInventory({
                id_sucursal: this.selectedBranchId,
                id_producto: productId
            }).subscribe({
                next: (inventory) => {
                    // Update inventory map
                    inventory.forEach(item => {
                        this.inventoryMap.set(item.id_producto, item);
                    });
                    this.isLoading = false;

                    // Now process the product addition with updated inventory data
                    this.processProductAddition(product, cantidad);
                },
                error: (error) => {
                    this.isLoading = false;
                    this.snackBar.open('Error al verificar el stock disponible', 'Cerrar', {
                        duration: 3000
                    });
                    console.error('Error checking inventory', error);
                }
            });
        } else {
            // We already have inventory data, proceed with the addition
            this.processProductAddition(product, cantidad);
        }
    }

    /**
     * Process the product addition after inventory validation
     */
    private processProductAddition(product: Producto, cantidad: number): void {
        // Check if the product already exists in the order
        const existingDetail = this.orderDetails.find(d => d.id_producto === product.id_producto);

        if (existingDetail) {
            // Calculate total quantity needed
            const totalQuantity = existingDetail.cantidad + cantidad;

            // Verify stock for the total quantity
            if (!this.hasEnoughStock(product.id_producto, totalQuantity)) {
                const inventoryItem = this.inventoryMap.get(product.id_producto);
                const availableStock = inventoryItem ? inventoryItem.cantidad : 0;

                this.snackBar.open(
                    `Stock insuficiente. Solo hay ${availableStock} unidades disponibles.`,
                    'Cerrar',
                    { duration: 5000 }
                );
                return;
            }

            // Update existing detail
            existingDetail.cantidad = totalQuantity;
            existingDetail.subtotal = existingDetail.cantidad * existingDetail.precio_unitario;

            // Update local inventory tracking to reflect the change
            const inventoryItem = this.inventoryMap.get(product.id_producto);
            if (inventoryItem) {
                inventoryItem.cantidad -= cantidad;
                this.inventoryMap.set(product.id_producto, inventoryItem);
            }
        } else {
            // Verify stock for a new product
            if (!this.hasEnoughStock(product.id_producto, cantidad)) {
                const inventoryItem = this.inventoryMap.get(product.id_producto);
                const availableStock = inventoryItem ? inventoryItem.cantidad : 0;

                this.snackBar.open(
                    `Stock insuficiente. Solo hay ${availableStock} unidades disponibles.`,
                    'Cerrar',
                    { duration: 5000 }
                );
                return;
            }

            // Add new product to order
            const newDetail: Partial<DetallePedido> = {
                id_producto: product.id_producto,
                producto_nombre: product.nombre_producto,
                cantidad: cantidad,
                precio_unitario: Number(product.precio_venta),
                subtotal: cantidad * Number(product.precio_venta)
            };

            this.orderDetails.push(newDetail as DetallePedido);

            // Update local inventory tracking
            const inventoryItem = this.inventoryMap.get(product.id_producto);
            if (inventoryItem) {
                inventoryItem.cantidad -= cantidad;
                this.inventoryMap.set(product.id_producto, inventoryItem);
            }
        }

        // Refresh the display
        this.orderDetails = [...this.orderDetails];
        this.updateTotal();

        // Reset form fields
        this.orderForm.get('producto')?.reset();
        this.orderForm.get('cantidad')?.setValue(1);

        // Show success message
        this.snackBar.open('Producto agregado al pedido', 'Cerrar', {
            duration: 3000
        });
    }

    removeProduct(detail: DetallePedido): void {
        if (detail.id_detalle_pedido) {
            // Si tiene ID, es un detalle existente, necesitamos eliminarlo del servidor
            this.deleteOrderDetail(detail);
        } else {
            // Si no tiene ID, solo lo removemos del array local
            const index = this.orderDetails.indexOf(detail);
            if (index > -1) {
                // Add the quantity back to our local inventory tracking
                if (this.inventoryMap.has(detail.id_producto)) {
                    const inventoryItem = this.inventoryMap.get(detail.id_producto)!;
                    inventoryItem.cantidad += detail.cantidad;
                    this.inventoryMap.set(detail.id_producto, inventoryItem);
                }

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
                    // Add the quantity back to our local inventory tracking
                    if (this.inventoryMap.has(detail.id_producto)) {
                        const inventoryItem = this.inventoryMap.get(detail.id_producto)!;
                        inventoryItem.cantidad += detail.cantidad;
                        this.inventoryMap.set(detail.id_producto, inventoryItem);
                    }

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

        const fullOrderData: Pedido = {
            id_mesa: orderData.id_mesa,
            id_pedido: 0, // El backend asignará el ID real
            estado: 'pendiente',
            total: 0, // Se actualizará con los detalles
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.ordersService.createOrder(fullOrderData).subscribe({
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
        let detailErrors = 0;

        if (newDetails.length === 0) {
            this.finalizeOrder();
            return;
        }

        // Create an array of observables for all detail additions
        const detailRequests = newDetails.map(detail => {
            const detailData = {
                id_pedido: orderId,
                id_producto: detail.id_producto,
                cantidad: detail.cantidad
            };

            const fullDetailData: DetallePedido = {
                id_pedido: detailData.id_pedido,
                id_producto: detailData.id_producto,
                cantidad: detailData.cantidad,
                id_detalle_pedido: 0, // El backend asignará el ID real
                precio_unitario: 0 // Asumiendo que el backend calculará este valor
            };

            return this.ordersService.createOrderDetail(fullDetailData).pipe(
                map(() => true),
                catchError(error => {
                    console.error('Error adding order detail', error);
                    return of(false);
                })
            );
        });

        // Execute all requests in parallel
        forkJoin(detailRequests).subscribe({
            next: (results) => {
                // Count successes and failures
                const successCount = results.filter(success => success).length;
                const failureCount = results.length - successCount;

                if (failureCount > 0) {
                    this.snackBar.open(
                        `Advertencia: ${failureCount} productos no pudieron ser agregados debido a insuficiente stock.`,
                        'Cerrar',
                        { duration: 5000 }
                    );
                }

                this.finalizeOrder();
            },
            error: () => {
                this.isSubmitting = false;
                this.snackBar.open('Error al agregar productos al pedido', 'Cerrar', {
                    duration: 3000
                });
            }
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