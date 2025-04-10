import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reporte } from '../models/reports.model';

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private apiUrl = `${environment.apiUrl}reports/`;

    constructor(private http: HttpClient) { }

    // Reportes
    getReports(filters?: any): Observable<Reporte[]> {
        let url = `${this.apiUrl}`;
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
        return this.http.get<Reporte[]>(url);
    }

    getReportById(id: number): Observable<Reporte> {
        return this.http.get<Reporte>(`${this.apiUrl}${id}/`);
    }

    createReport(report: Reporte): Observable<Reporte> {
        return this.http.post<Reporte>(this.apiUrl, report);
    }

    updateReport(id: number, report: Partial<Reporte>): Observable<Reporte> {
        return this.http.patch<Reporte>(`${this.apiUrl}${id}/`, report);
    }

    deleteReport(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}${id}/`);
    }

    // Descargar reporte
    downloadReport(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}${id}/descargar/`, {
            responseType: 'blob'
        });
    }

    // Métodos de conveniencia
    getReportsByBranch(branchId: number): Observable<Reporte[]> {
        return this.getReports({ sucursal: branchId });
    }

    getReportsByUser(userId: number): Observable<Reporte[]> {
        return this.getReports({ usuario: userId });
    }

    getReportsByFormat(format: string): Observable<Reporte[]> {
        return this.getReports({ formato: format });
    }

    getReportsByDateRange(startDate: string, endDate: string): Observable<Reporte[]> {
        return this.getReports({
            fecha_inicio__gte: startDate,
            fecha_fin__lte: endDate
        });
    }
}