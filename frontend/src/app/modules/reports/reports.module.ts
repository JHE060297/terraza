import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { ReportsFormComponent } from './reports-form/reports-form.component';

const routes: Routes = [
  {
    path: '',
    component: ReportsFormComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['administrador', 'cajero']
    }
  },
  {
    path: 'new',
    component: ReportsFormComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['administrador', 'cajero']
    }
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    ReportsFormComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ReportsModule { }