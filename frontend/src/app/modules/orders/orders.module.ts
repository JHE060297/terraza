import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { OrdersViewComponent } from './order-view/orders-view.component';
import { OrderFormComponent } from './order-form/order-form.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';

const routes: Routes = [
  {
    path: '',
    component: OrdersViewComponent,
    canActivate: [authGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  },
  {
    path: 'new',
    component: OrderFormComponent,
    canActivate: [authGuard],
    data: { roles: ['administrador', 'mesero'] }
  },
  {
    path: ':id',
    component: OrderDetailComponent, // Necesita ser creado
    canActivate: [authGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    OrdersViewComponent,
    OrderFormComponent,
    OrderDetailComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class OrdersModule { }
