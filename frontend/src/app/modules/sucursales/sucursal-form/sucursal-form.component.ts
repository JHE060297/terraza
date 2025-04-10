// src/app/modules/branches/sucursal-form/sucursal-form.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SucursalService } from '../../../core/services/sucursales.service';
import { Sucursal } from '../../../core/models/user.model';
import { finalize } from 'rxjs/operators';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-sucursal-form',
    imports: [sharedImports],
    templateUrl: './sucursal-form.component.html',
    styleUrls: ['./sucursal-form.component.scss']
})
export class SucursalFormComponent implements OnInit {
    branchForm: FormGroup;
    isNewBranch: boolean = true;
    branchId: number | null = null;
    isLoading: boolean = false;
    isSubmitting: boolean = false;
    error: string = '';

    constructor(
        private fb: FormBuilder,
        private sucursalService: SucursalService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.branchForm = this.createForm();
    }

    ngOnInit(): void {
        // Determinar si es nuevo o edición basado en el URL
        const idParam = this.route.snapshot.paramMap.get('id');
        this.branchId = idParam ? +idParam : null;
        this.isNewBranch = !this.branchId;

        // Si es edición, cargar los datos de la sucursal
        if (!this.isNewBranch) {
            this.loadBranchData();
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            nombre_sucursal: ['', [Validators.required]],
            direccion: ['', [Validators.required]],
            telefono: ['', [Validators.required, Validators.pattern('[0-9]{7,15}')]]
        });
    }

    loadBranchData(): void {
        if (!this.branchId) return;

        this.isLoading = true;
        this.sucursalService.getBranchById(this.branchId)
            .pipe(
                finalize(() => this.isLoading = false)
            )
            .subscribe(
                (branch) => {
                    this.populateForm(branch);
                },
                (error) => {
                    this.error = 'Error al cargar datos de la sucursal';
                    console.error('Error loading branch data', error);
                }
            );
    }

    populateForm(branch: Sucursal): void {
        this.branchForm.patchValue({
            nombre_sucursal: branch.nombre_sucursal,
            direccion: branch.direccion,
            telefono: branch.telefono
        });
    }

    onSubmit(): void {
        if (this.branchForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        const branchData = this.branchForm.value;

        // Crear o actualizar sucursal según corresponda
        const operation = this.isNewBranch
            ? this.sucursalService.createBranch(branchData)
            : this.sucursalService.updateBranch(this.branchId as number, branchData);

        operation.pipe(
            finalize(() => this.isSubmitting = false)
        ).subscribe(
            (response) => {
                this.snackBar.open(
                    this.isNewBranch
                        ? 'Sucursal creada exitosamente'
                        : 'Sucursal actualizada exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
                this.router.navigate(['/branches']);
            },
            (error) => {
                const errorMessage = this.isNewBranch
                    ? 'Error al crear sucursal'
                    : 'Error al actualizar sucursal';
                this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
                console.error('Error with branch operation', error);
            }
        );
    }

    onCancel(): void {
        this.router.navigate(['/branches']);
    }
}