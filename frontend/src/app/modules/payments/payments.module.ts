import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { PaymentFormComponent } from './payment-form/payment-form.component';
import { SucursalServiceResolver } from './sucursal-service.resolver';
import { PaymentsListComponent } from './payments-list/payments-list.component';

const routes: Routes = [
  {
    path: '',
    component: PaymentsListComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['administrador', 'cajero'],
      title: 'Gestión de Pagos',
      message: 'Aquí podrás ver todos los pagos realizados.'
    }
  },
  {
    path: 'new',
    component: PaymentFormComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['administrador', 'cajero']
    },
    resolve: {
      sucursalesService: SucursalServiceResolver
    }
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    PaymentFormComponent,
    PaymentsListComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class PaymentsModule { }