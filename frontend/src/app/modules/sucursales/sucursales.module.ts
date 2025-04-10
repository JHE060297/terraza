import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SucursalListComponent } from './sucursal-list/sucursal-list.component';
import { SucursalFormComponent } from './sucursal-form/sucursal-form.component';
import { MesasListComponent } from '../tables/tables-list/tables-list.component';
import { TableFormComponent } from '../tables/table-form/table-form.component';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';


const routes: Routes = [
    {
        path: '',
        component: SucursalListComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    },
    {
        path: 'new',
        component: SucursalFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    },
    {
        path: 'edit/:id',
        component: SucursalFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    },
    {
        path: ':id/tables',
        component: MesasListComponent,
        canActivate: [authGuard],
        data: { roles: ['administrador', 'cajero', 'mesero'] }
    },
    {
        path: ':id/tables/new',
        component: TableFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    },
    {
        path: ':id/tables/edit/:tableId',
        component: TableFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    }
];

@NgModule({
    declarations: [

    ],
    imports: [
        CommonModule,
        SharedModule,
        RouterModule.forChild(routes),
        SucursalListComponent,
        SucursalFormComponent,
        MesasListComponent,
        TableFormComponent
    ],
    exports: [RouterModule]
})
export class SucursalesModule { }