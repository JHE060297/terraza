import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inventario, AjusteInventario } from '../../../core/models/inventory.model';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-stock-adjustment-dialog',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './stock-adjustment-dialog.component.html',
    styleUrls: ['./stock-adjustment-dialog.component.scss']
})
export class StockAdjustmentDialogComponent implements OnInit {
    adjustmentForm: FormGroup;
    isSubmitting = false;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<StockAdjustmentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { inventoryItem: Inventario, allowNegative: boolean }
    ) {
        this.adjustmentForm = this.createForm();
    }

    ngOnInit(): void {
    }

    createForm(): FormGroup {
        return this.fb.group({
            cantidad: [0, [Validators.required, Validators.pattern('^-?[0-9]+$')]],  // Asegura que sea un entero
            tipo_transaccion: ['ajuste', [Validators.required]],
            comentario: ['', [Validators.maxLength(255)]]
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSubmit(): void {
        if (this.adjustmentForm.invalid) {
            return;
        }

        // Verificar que la cantidad no sea 0
        const cantidad = this.adjustmentForm.get('cantidad')?.value;
        if (cantidad === 0) {
            return;
        }

        // Verificar que no resulte en stock negativo si no está permitido
        if (!this.data.allowNegative &&
            this.data.inventoryItem.cantidad + cantidad < 0) {
            this.adjustmentForm.get('cantidad')?.setErrors({
                negativeStock: true
            });
            return;
        }

        const adjustment: AjusteInventario = {
            cantidad: cantidad,
            tipo_transaccion: this.adjustmentForm.get('tipo_transaccion')?.value,
        };

        this.dialogRef.close(adjustment);
    }
}