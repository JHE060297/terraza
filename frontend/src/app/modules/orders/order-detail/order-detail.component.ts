// order-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Pedido, DetallePedido } from '../../../core/models/orders.model';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [sharedImports],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  order: Pedido | null = null;
  isLoading = false;
  error = '';
  displayedColumns: string[] = ['producto', 'cantidad', 'precio_unitario', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordersService: OrdersService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));
    if (orderId) {
      this.loadOrderDetails(orderId);
    } else {
      this.error = 'ID de pedido no especificado';
    }
  }

  loadOrderDetails(orderId: number): void {
    this.isLoading = true;
    this.ordersService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los detalles del pedido';
        console.error('Error loading order details', error);
        this.isLoading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'entregado': return 'Entregado';
      case 'pagado': return 'Pagado';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pendiente': return 'status-pending';
      case 'entregado': return 'status-delivered';
      case 'pagado': return 'status-paid';
      default: return '';
    }
  }

  processPayment(): void {
    if (!this.order) return;

    if (!this.authService.isAdmin() && !this.authService.isCajero()) {
      this.snackBar.open('No tienes permisos para procesar pagos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (this.order.estado === 'pagado') {
      this.snackBar.open('Este pedido ya ha sido pagado', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.router.navigate(['/payments/new'], {
      queryParams: { orderId: this.order.id_pedido }
    });
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }
}