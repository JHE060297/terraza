import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { ProductFormComponent } from '../products/product-form/product-form.component';
import { ProductListComponent } from '../products/product-list/product-list.component';

const routes: Routes = [
    {
        path: '',
        component: ProductListComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador', 'cajero'] }
    },
    {
        path: 'new',
        component: ProductFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    },
    {
        path: 'edit/:id',
        component: ProductFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['administrador'] }
    }
];

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        SharedModule,
        ProductFormComponent,
        ProductListComponent,
        RouterModule.forChild(routes)
    ],
    exports: [RouterModule]
})
export class ProductsModule { }