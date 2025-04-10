
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TablesViewComponent } from './tables-view/tables-view.component';
import { TableDetailComponent } from './table-detail/table-detail.component';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: TablesViewComponent,
    canActivate: [authGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  },
  {
    path: ':id',
    component: TableDetailComponent,
    canActivate: [authGuard],
    data: { roles: ['administrador', 'cajero', 'mesero'] }
  }
];

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    SharedModule,
    TablesViewComponent,
    TableDetailComponent,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class TablesModule { }