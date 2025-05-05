// En frontend/src/app/core/services/reports.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reporte, ResumenVentas, DetalleVentaProducto } from '../models/reports.model';

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private apiUrl = `${environment.apiUrl}reports/`;

    constructor(private http: HttpClient) { }

    generateReport(reportData: any): Observable<Blob | any> {
        const endpoint = 'generate';

        // Si el formato es JSON, devolvemos un objeto JSON
        if (reportData.formato === 'json') {
            return this.http.post<any>(`${this.apiUrl}${endpoint}`, reportData);
        }

        // Si es xlsx o csv, devolvemos un Blob
        return this.http.post(`${this.apiUrl}${endpoint}`, reportData, {
            responseType: 'blob'
        });
    }

    // Método para descargar el reporte generado
    downloadGeneratedReport(blob: Blob, filename: string): void {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Obtener todos los reportes generados
    getReports(): Observable<Reporte[]> {
        return this.http.get<Reporte[]>(`${this.apiUrl}`);
    }

    // Obtener un reporte específico
    getReportById(id: number): Observable<Reporte> {
        return this.http.get<Reporte>(`${this.apiUrl}${id}`);
    }
}