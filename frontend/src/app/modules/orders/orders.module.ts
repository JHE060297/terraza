import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { PlaceholderComponent } from '../../shared/components/placeholder/placeholder.component';
import { OrdersViewComponent } from './order-view/orders-view.component';
import { OrderFormComponent } from './order-form/order-form.component';

const routes: Routes = [
  {
    path: '',
    component: OrdersViewComponent,
    canActivate: [authGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  },
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class OrdersModule { }
