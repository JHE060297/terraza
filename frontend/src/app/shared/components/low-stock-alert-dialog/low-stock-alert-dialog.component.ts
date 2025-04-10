import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inventario } from '../../../core/models/inventory.model';
import { sharedImports } from '../../shared.imports';

@Component({
  selector: 'app-low-stock-alert-dialog',
  standalone: true,
  imports: [sharedImports],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">warning</mat-icon>
      Alerta de Bajo Stock
    </h2>
    <div mat-dialog-content>
      <p>Los siguientes productos están por debajo del umbral de stock mínimo:</p>
      
      <mat-list>
        <mat-list-item *ngFor="let item of data.items">
          <div class="list-item-content">
            <div class="item-info">
              <span class="item-name"><strong>{{ item.nombre_producto }}</strong></span>
              <span class="item-branch">{{ item.nombre_sucursal }}</span>
            </div>
            <div class="item-stock">
              <span class="stock-value">{{ item.cantidad }}</span>
              <span class="stock-threshold">(Min: {{ item.alerta }})</span>
            </div>                                                                                  
          </div>
        </mat-list-item>
      </mat-list>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cerrar</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Ver Inventario</button>
    </div>
  `,
  styles: [`
    .list-item-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      
      .item-name {
        font-weight: 500;
      }
      
      .item-branch {
        font-size: 12px;
        color: #666;
      }
    }

    .item-stock {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      
      .stock-value {
        font-weight: 500;
        color: #f44336;
      }
      
      .stock-threshold {
        font-size: 12px;
        color: #666;
      }
    }

    h2 {
      display: flex;
      align-items: center;
      
      mat-icon {
        margin-right: 8px;
      }
    }

    mat-list {
      max-height: 300px;
      overflow-y: auto;
    }
  `]
})
export class LowStockAlertDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<LowStockAlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { items: Inventario[] }
  ) { }

  ngOnInit(): void {
  }
}