import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Pedido,
    DetallePedido,
    PedidoMesero,
    Pago
} from '../models/orders.model';

@Injectable({
    providedIn: 'root'
})
export class OrdersService {
    private apiUrl = `${environment.apiUrl}orders/`;

    constructor(private http: HttpClient) { }

    // Pedidos
    getOrders(filters?: any): Observable<Pedido[]> {
        let url = `${this.apiUrl}pedidos/`;
        if (filters) {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params.set(key, filters[key]);
                }
            });
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        return this.http.get<Pedido[]>(url);
    }

    getOrderById(id: number): Observable<Pedido> {
        return this.http.get<Pedido>(`${this.apiUrl}pedidos/${id}/`);
    }

    createOrder(order: Pedido): Observable<Pedido> {
        return this.http.post<Pedido>(`${this.apiUrl}pedidos/`, order);
    }

    updateOrder(id: number, order: Partial<Pedido>): Observable<Pedido> {
        return this.http.patch<Pedido>(`${this.apiUrl}pedidos/${id}/`, order);
    }

    deleteOrder(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}pedidos/${id}/`);
    }

    changeOrderStatus(id: number, estado: string): Observable<any> {
        return this.http.post(`${this.apiUrl}pedidos/${id}/cambiar_estado/`, { estado });
    }

    // Detalles de pedido
    getOrderDetails(filters?: any): Observable<DetallePedido[]> {
        let url = `${this.apiUrl}detalles/`;
        if (filters) {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params.set(key, filters[key]);
                }
            });
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        return this.http.get<DetallePedido[]>(url);
    }

    getOrderDetailById(id: number): Observable<DetallePedido> {
        return this.http.get<DetallePedido>(`${this.apiUrl}detalles/${id}/`);
    }

    createOrderDetail(detail: DetallePedido): Observable<DetallePedido> {
        return this.http.post<DetallePedido>(`${this.apiUrl}detalles/`, detail);
    }

    updateOrderDetail(id: number, detail: Partial<DetallePedido>): Observable<DetallePedido> {
        return this.http.patch<DetallePedido>(`${this.apiUrl}detalles/${id}/`, detail);
    }

    deleteOrderDetail(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}detalles/${id}/`);
    }

    // Pedidos de mesero
    getWaiterAssignments(filters?: any): Observable<PedidoMesero[]> {
        let url = `${this.apiUrl}asignaciones/`;
        if (filters) {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params.set(key, filters[key]);
                }
            });
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        return this.http.get<PedidoMesero[]>(url);
    }

    // Pagos
    getPayments(filters?: any): Observable<Pago[]> {
        let url = `${this.apiUrl}pagos/`;
        if (filters) {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params.set(key, filters[key]);
                }
            });
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        return this.http.get<Pago[]>(url);
    }

    getPaymentById(id: number): Observable<Pago> {
        return this.http.get<Pago>(`${this.apiUrl}pagos/${id}/`);
    }

    createPayment(payment: Pago): Observable<Pago> {
        return this.http.post<Pago>(`${this.apiUrl}pagos/`, payment);
    }

    // Métodos de conveniencia
    getOrdersByTable(tableId: number): Observable<Pedido[]> {
        return this.getOrders({ id_mesa: tableId });
    }

    getOrdersByStatus(status: string): Observable<Pedido[]> {
        return this.getOrders({ estado: status });
    }

    getPendingOrders(): Observable<Pedido[]> {
        return this.getOrdersByStatus('pendiente');
    }

    getOrderDetailsByOrder(orderId: number): Observable<DetallePedido[]> {
        return this.getOrderDetails({ id_pedido: orderId });
    }

    getPaymentsByOrder(orderId: number): Observable<Pago[]> {
        return this.getPayments({ id_pedido: orderId });
    }
}