import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { InventoryStockComponent } from './inventory-stock/inventory-stock.component';
import { InventoryTransactionsComponent } from './inventory-transactions/inventory-transactions.component';
import { StockAdjustmentDialogComponent } from './stock-adjustment-dialog/stock-adjustment-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: InventoryStockComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  },
  {
    path: 'transactions',
    component: InventoryTransactionsComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador', 'cajero'] }
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    InventoryStockComponent,
    InventoryTransactionsComponent,
    StockAdjustmentDialogComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class InventoryModule { }