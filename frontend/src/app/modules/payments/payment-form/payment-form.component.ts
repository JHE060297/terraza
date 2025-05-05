import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Pedido, Pago } from '../../../core/models/orders.model';
import { sharedImports } from '../../../shared/shared.imports';
import { SucursalService } from '../../../core/services/sucursales.service';

@Component({
    selector: 'app-payment-form',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './payment-form.component.html',
    styleUrls: ['./payment-form.component.scss']
})
export class PaymentFormComponent implements OnInit {
    paymentForm: FormGroup;
    order: Pedido | null = null;
    isLoading = false;
    isSubmitting = false;
    error = '';
    orderId: number | null = null;

    paymentMethods = [
        { value: 'efectivo', label: 'Efectivo' },
        { value: 'tarjeta', label: 'Tarjeta' },
        { value: 'nequi', label: 'Nequi' },
        { value: 'daviplata', label: 'Daviplata' }
    ];

    constructor(
        private fb: FormBuilder,
        private ordersService: OrdersService,
        private sucursalesService: SucursalService,
        public authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.paymentForm = this.createForm();
    }

    ngOnInit(): void {
        // Verificar permisos
        if (!this.authService.isAdmin() && !this.authService.isCajero()) {
            this.snackBar.open('No tiene permisos para procesar pagos', 'Cerrar', {
                duration: 3000
            });
            this.router.navigate(['/orders']);
            return;
        }

        this.orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
        if (this.orderId) {
            this.loadOrderDetails();
        } else {
            this.snackBar.open('Pedido no especificado', 'Cerrar', {
                duration: 3000
            });
            this.router.navigate(['/orders']);
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            id_pedido: ['', [Validators.required]],
            monto: [{ value: 0, disabled: true }, [Validators.required]],
            metodo_pago: ['', [Validators.required]],
            referencia_pago: ['']
        });
    }

    loadOrderDetails(): void {
        if (!this.orderId) return;

        this.isLoading = true;
        this.ordersService.getOrderById(this.orderId).subscribe({
            next: (order) => {
                if (order.estado === 'pagado') {
                    this.snackBar.open('Este pedido ya ha sido pagado', 'Cerrar', {
                        duration: 3000
                    });
                    this.router.navigate(['/orders']);
                    return;
                }

                this.order = order;
                this.paymentForm.patchValue({
                    id_pedido: order.id_pedido,
                    monto: order.total
                });
                this.isLoading = false;
            },
            error: (error) => {
                this.error = 'Error al cargar los detalles del pedido';
                console.error('Error loading order details', error);
                this.isLoading = false;
            }
        });
    }

    onPaymentMethodChange(): void {
        const selectedMethod = this.paymentForm.get('metodo_pago')?.value;
        const referenciaControl = this.paymentForm.get('referencia_pago');

        // Si es pago electrónico, la referencia es requerida
        if (selectedMethod && selectedMethod !== 'efectivo') {
            referenciaControl?.setValidators([Validators.required]);
        } else {
            referenciaControl?.clearValidators();
        }

        referenciaControl?.updateValueAndValidity();
    }

    onSubmit(): void {
        if (this.paymentForm.invalid) {
            this.snackBar.open('Por favor, complete todos los campos requeridos', 'Cerrar', {
                duration: 3000
            });
            return;
        }

        this.isSubmitting = true;
        const paymentData = {
            id_pedido: this.paymentForm.get('id_pedido')?.value,
            monto: this.order?.total,
            metodo_pago: this.paymentForm.get('metodo_pago')?.value,
            referencia_pago: this.paymentForm.get('referencia_pago')?.value ?? ''
        };

        const fullPaymentData: Pago = {
            id_pago: 0, // El backend asignará el ID real
            id_pedido: paymentData.id_pedido,
            id_usuario: this.authService.currentUserSubject.value?.id_usuario ?? 0,
            monto: paymentData.monto ?? 0,
            metodo_pago: paymentData.metodo_pago as 'efectivo' | 'tarjeta' | 'nequi' | 'daviplata',
            fecha_hora: new Date().toISOString(),
            referencia_pago: paymentData.referencia_pago
        };

        this.ordersService.createPayment(fullPaymentData).subscribe({
            next: (payment) => {
                this.snackBar.open('Pago procesado exitosamente', 'Cerrar', {
                    duration: 3000
                });

                // Liberar la mesa automáticamente después del pago
                if (this.order) {
                    this.liberarMesa(this.order.id_mesa);
                } else {
                    this.router.navigate(['/orders']);
                }
            },
            error: (error) => {
                this.isSubmitting = false;
                console.error('Error processing payment', error);
                this.snackBar.open('Error al procesar el pago', 'Cerrar', {
                    duration: 3000
                });
            }
        });
    }

    liberarMesa(tableId: number): void {
        // Obtener el servicio de sucursales del resolver
        const sucursalesService = this.sucursalesService || this.route.snapshot.data['sucursalesService'];

        if (sucursalesService) {
            sucursalesService.freeTable(tableId).subscribe({
                next: () => {
                    this.snackBar.open('Mesa liberada exitosamente', 'Cerrar', {
                        duration: 3000
                    });
                    this.router.navigate(['/orders']);
                },
                error: (error) => {
                    console.error('Error freeing table', error);
                    this.snackBar.open('Error al liberar la mesa, pero el pago fue procesado', 'Cerrar', {
                        duration: 3000
                    });
                    this.router.navigate(['/orders']);
                }
            });
        } else {
            this.snackBar.open('Pago procesado exitosamente', 'Cerrar', {
                duration: 3000
            });
            this.router.navigate(['/orders']);
        }
    }

    cancel(): void {
        this.router.navigate(['/orders']);
    }
}