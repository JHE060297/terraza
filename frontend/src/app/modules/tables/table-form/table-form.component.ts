// src/app/modules/branches/table-form/table-form.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SucursalService } from '../../../core/services/sucursales.service';
import { Sucursal } from '../../../core/models/user.model';
import { Mesa } from '../../../core/models/orders.model';
import { finalize } from 'rxjs/operators';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-table-form',
    imports: [sharedImports],
    templateUrl: './table-form.component.html',
    styleUrls: ['./table-form.component.scss']
})
export class TableFormComponent implements OnInit {
    tableForm: FormGroup;
    isNewTable: boolean = true;
    branchId: number;
    tableId: number | null = null;
    branch: Sucursal | null = null;
    isLoading: boolean = false;
    isSubmitting: boolean = false;
    error: string = '';

    constructor(
        private fb: FormBuilder,
        private sucursalesService: SucursalService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        // Obtener el ID de la sucursal
        const branchIdParam = this.route.snapshot.paramMap.get('id');
        if (!branchIdParam) {
            this.router.navigate(['/branches']);
            throw new Error('Branch ID is required');
        }
        this.branchId = +branchIdParam;

        // Crear el formulario
        this.tableForm = this.createForm();

        // Determinar si es nuevo o edición
        const tableIdParam = this.route.snapshot.paramMap.get('tableId');
        this.tableId = tableIdParam ? +tableIdParam : null;
        this.isNewTable = !this.tableId;
    }

    ngOnInit(): void {
        // Cargar datos de la sucursal
        this.loadBranchData();

        // Si es edición, cargar datos de la mesa
        if (!this.isNewTable && this.tableId) {
            this.loadTableData();
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            numero: ['', [Validators.required, Validators.min(1)]],
            estado: ['libre', [Validators.required]],
            is_active: [true]
        });
    }

    loadBranchData(): void {
        this.isLoading = true;
        this.sucursalesService.getBranchById(this.branchId)
            .pipe(
                finalize(() => {
                    if (this.isNewTable || !this.tableId) {
                        this.isLoading = false;
                    }
                })
            )
            .subscribe(
                (branch) => {
                    this.branch = branch;
                },
                (error) => {
                    this.error = 'Error al cargar datos de la sucursal';
                    console.error('Error loading branch data', error);
                }
            );
    }

    loadTableData(): void {
        if (!this.tableId) return;

        this.isLoading = true;
        this.sucursalesService.getTableById(this.tableId)
            .pipe(
                finalize(() => this.isLoading = false)
            )
            .subscribe(
                (table) => {
                    this.populateForm(table);
                },
                (error) => {
                    this.error = 'Error al cargar datos de la mesa';
                    console.error('Error loading table data', error);
                }
            );
    }

    populateForm(table: Mesa): void {
        this.tableForm.patchValue({
            numero: table.numero,
            estado: table.estado,
            is_active: table.is_active
        });
    }

    onSubmit(): void {
        if (this.tableForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        const tableData = {
            ...this.tableForm.value,
            id_sucursal: this.branchId
        };

        // Crear o actualizar mesa según corresponda
        const operation = this.isNewTable
            ? this.sucursalesService.createTable(tableData)
            : this.sucursalesService.updateTable(this.tableId as number, tableData);

        operation.pipe(
            finalize(() => this.isSubmitting = false)
        ).subscribe(
            (response) => {
                this.snackBar.open(
                    this.isNewTable
                        ? 'Mesa creada exitosamente'
                        : 'Mesa actualizada exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
                this.router.navigate(['/branches', this.branchId, 'tables']);
            },
            (error) => {
                const errorMessage = this.isNewTable
                    ? 'Error al crear mesa'
                    : 'Error al actualizar mesa';
                this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
                console.error('Error with table operation', error);
            }
        );
    }

    onCancel(): void {
        this.router.navigate(['/branches', this.branchId, 'tables']);
    }
}