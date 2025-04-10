import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sucursal } from '../models/user.model';
import { Mesa } from '../models/orders.model';

@Injectable({
    providedIn: 'root'
})
export class SucursalService {
    private apiUrl = `${environment.apiUrl}sucursales/`;

    constructor(private http: HttpClient) { }

    // Sucursales
    getBranches(): Observable<Sucursal[]> {
        return this.http.get<Sucursal[]>(`${this.apiUrl}sucursales/`);
    }

    getBranchById(id: number): Observable<Sucursal> {
        return this.http.get<Sucursal>(`${this.apiUrl}sucursales/${id}/`);
    }

    createBranch(branch: Sucursal): Observable<Sucursal> {
        return this.http.post<Sucursal>(`${this.apiUrl}sucursales/`, branch);
    }

    updateBranch(id: number, branch: Partial<Sucursal>): Observable<Sucursal> {
        return this.http.patch<Sucursal>(`${this.apiUrl}sucursales/${id}/`, branch);
    }

    deleteBranch(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}sucursales/${id}/`);
    }

    // Mesas
    getTables(filters?: any): Observable<Mesa[]> {
        let params = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params = params.set(key, filters[key]);
                }
            });
        }
        return this.http.get<Mesa[]>(`${this.apiUrl}mesas/`, { params });
    }

    getTableById(id: number): Observable<Mesa> {
        return this.http.get<Mesa>(`${this.apiUrl}mesas/${id}/`);
    }

    createTable(table: Mesa): Observable<Mesa> {
        return this.http.post<Mesa>(`${this.apiUrl}mesas/`, table);
    }

    updateTable(id: number, table: Partial<Mesa>): Observable<Mesa> {
        return this.http.patch<Mesa>(`${this.apiUrl}mesas/${id}/`, table);
    }

    deleteTable(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}mesas/${id}/`);
    }

    changeTableStatus(id: number, estado: string): Observable<any> {
        return this.http.post(`${this.apiUrl}mesas/${id}/cambiar_estado/`, { estado });
    }

    freeTable(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}mesas/${id}/liberar_mesa/`, {});
    }

    getTablesByBranch(branchId: number): Observable<Mesa[]> {
        return this.getTables({ id_sucursal: branchId });
    }
}