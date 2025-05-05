// En frontend/src/app/modules/reports/reports-form/reports-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReportsService } from '../../../core/services/reports.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { Sucursal } from '../../../core/models/user.model';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-reports-form',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './reports-form.component.html',
    styleUrls: ['./reports-form.component.scss']
})
export class ReportsFormComponent implements OnInit {
    reportForm: FormGroup;
    branches: Sucursal[] = [];
    isLoading = false;
    isSubmitting = false;
    error = '';
    isAdmin = false;
    userBranchId: number | null = null;

    formatOptions = [
        { value: 'xlsx', label: 'Excel (.xlsx)' },
        { value: 'csv', label: 'CSV (.csv)' },
        { value: 'json', label: 'JSON' }
    ];

    constructor(
        private fb: FormBuilder,
        private reportsService: ReportsService,
        private sucursalService: SucursalService,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.reportForm = this.createForm();
    }

    ngOnInit(): void {

        console.log('ReportsFormComponent inicializado');
        // Verificar roles
        this.isAdmin = this.authService.isAdmin();

        // Obtener ID de sucursal del usuario
        const currentUser = this.authService.currentUserSubject.value;
        if (currentUser) {
            this.userBranchId = currentUser.id_sucursal;

            // Si no es admin, establecer la sucursal y desactivar el campo
            if (!this.isAdmin) {
                this.reportForm.patchValue({ sucursal: this.userBranchId });
                this.reportForm.get('sucursal')?.disable();
            }
        }

        this.loadBranches();
    }

    createForm(): FormGroup {
        console.log('Creando formulario');

        // Establecer las fechas por defecto (último mes)
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        return this.fb.group({
            fecha_inicio: [lastMonth, [Validators.required]],
            fecha_fin: [today, [Validators.required]],
            sucursal: [null], // null para todas las sucursales
            formato: ['xlsx', [Validators.required]]
        });
    }

    loadBranches(): void {
        this.isLoading = true;

        // Solo cargar sucursales si es admin
        if (this.isAdmin) {
            this.sucursalService.getBranches().subscribe({
                next: (branches) => {
                    this.branches = branches;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.error = 'Error al cargar sucursales';
                    console.error('Error loading branches', error);
                    this.isLoading = false;
                }
            });
        } else {
            this.isLoading = false;
        }
    }

    onSubmit(): void {
        if (this.reportForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        const formValues = this.reportForm.getRawValue(); // Obtener valores incluso de campos deshabilitados

        console.log('Enviando datos para reporte:', formValues);

        // Preparar el objeto para la solicitud
        const reportData = {
            fecha_inicio: this.formatDate(formValues.fecha_inicio),
            fecha_fin: this.formatDate(formValues.fecha_fin),
            id_sucursal: formValues.sucursal,
            formato: formValues.formato
        };

        this.reportsService.generateReport(reportData).subscribe({
            next: (response) => {
                this.isSubmitting = false;

                if (formValues.formato === 'json') {
                    // Mostrar resultados en la interfaz
                    this.snackBar.open('Reporte generado exitosamente', 'Cerrar', {
                        duration: 3000
                    });

                    // Aquí podrías navegar a un componente para mostrar los resultados
                    // o mostrarlos en el mismo componente
                } else {
                    // Descargar el archivo
                    const extension = formValues.formato === 'xlsx' ? '.xlsx' : '.csv';
                    const filename = `reporte_ventas_${this.formatDate(new Date())}${extension}`;
                    this.reportsService.downloadGeneratedReport(response, filename);

                    this.snackBar.open('Reporte descargado exitosamente', 'Cerrar', {
                        duration: 3000
                    });
                }
            },
            error: (error) => {
                this.isSubmitting = false;
                console.error('Error generating report', error);
                this.snackBar.open('Error al generar el reporte', 'Cerrar', {
                    duration: 3000
                });
            }
        });
    }

    formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    cancel(): void {
        this.router.navigate(['/reports']);
    }
}