import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { sharedImports } from '../../shared.imports';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    color?: 'primary' | 'accent' | 'warn';
}

@Component({
    selector: 'app-confirm-dialog',
    imports: [sharedImports],
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) { }

    onNoClick(): void {
        this.dialogRef.close(false);
    }

    onYesClick(): void {
        this.dialogRef.close(true);
    }
}