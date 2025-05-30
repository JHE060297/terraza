import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Producto,
    Inventario,
    TransaccionInventario,
    AjusteInventario
} from '../models/inventory.model';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private apiUrl = `${environment.apiUrl}inventory/`;
    private destroy$ = new Subject<void>();

    constructor(private http: HttpClient) { }

    clearSubscriptions(): void {
        this.destroy$.next();
    }

    // Productos
    getProducts(filters?: any): Observable<Producto[]> {
        let url = `${this.apiUrl}productos/`;
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
        return this.http.get<Producto[]>(url);
    }

    getProductById(id: number): Observable<Producto> {
        return this.http.get<Producto>(`${this.apiUrl}productos/${id}/`);
    }

    createProduct(product: Producto): Observable<Producto> {
        return this.http.post<Producto>(`${this.apiUrl}productos/`, product);
    }

    updateProduct(id: number, product: Partial<Producto>): Observable<Producto> {
        return this.http.put<Producto>(`${this.apiUrl}productos/${id}/`, product);
    }

    deleteProduct(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}productos/${id}/`);
    }

    toggleProductActive(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}productos/${id}/toggle_active/`, {});
    }

    // Inventario
    getInventory(filters?: any): Observable<Inventario[]> {
        let url = `${this.apiUrl}inventario/`;
        if (filters) {
            let params = new HttpParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params = params.set(key, filters[key].toString());
                }
            });
            return this.http.get<Inventario[]>(url, { params });
        }
        return this.http.get<Inventario[]>(url);
    }

    getInventoryById(id: number): Observable<Inventario> {
        return this.http.get<Inventario>(`${this.apiUrl}inventario/${id}/`);
    }

    createInventory(inventory: Inventario): Observable<Inventario> {
        return this.http.post<Inventario>(`${this.apiUrl}inventario/`, inventory);
    }

    updateInventory(id: number, inventory: Partial<Inventario>): Observable<Inventario> {
        return this.http.patch<Inventario>(`${this.apiUrl}inventario/${id}/`, inventory);
    }

    deleteInventory(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}inventario/${id}/`);
    }

    adjustInventory(id: number, adjustment: AjusteInventario): Observable<any> {
        // Asegurarse de que el ID es un número válido
        if (!id || isNaN(id)) {
            throw new Error('ID de inventario inválido');
        }

        // Asegurarse de que la URL y el formato de los datos sean correctos
        const url = `${this.apiUrl}inventario/${id}/adjust_stock/`;

        return this.http.post<any>(url, adjustment);
    }

    // Transacciones
    getTransactions(filters?: any): Observable<TransaccionInventario[]> {
        let url = `${this.apiUrl}transacciones/`;
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
        return this.http.get<TransaccionInventario[]>(url);
    }

    getTransactionById(id: number): Observable<TransaccionInventario> {
        return this.http.get<TransaccionInventario>(`${this.apiUrl}transacciones/${id}/`);
    }

    createTransaction(transaction: TransaccionInventario): Observable<TransaccionInventario> {
        return this.http.post<TransaccionInventario>(`${this.apiUrl}transacciones/`, transaction);
    }

    // Métodos específicos
    getInventoryByBranch(branchId: number): Observable<Inventario[]> {
        return this.getInventory({ sucursal: branchId });
    }

    getLowStockItems(): Observable<Inventario[]> {
        return this.getInventory({ is_low_stock: true });
    }

    getProductInventoryByBranch(productId: number, branchId: number): Observable<Inventario> {
        return this.http.get<Inventario>(`${this.apiUrl}inventario/?producto=${productId}&sucursal=${branchId}`);
    }
}