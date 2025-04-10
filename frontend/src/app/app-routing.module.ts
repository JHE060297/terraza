import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'access-denied',
        component: AccessDeniedComponent
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
            },
            {
                path: 'users',
                loadChildren: () => import('./modules/users/users.module').then(m => m.UsersModule),
                data: { roles: ['administrador'] }
            },
            {
                path: 'inventory',
                loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule),
                data: { roles: ['administrador', 'cajero'] }
            },
            {
                path: 'orders',
                loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule),
                data: { roles: ['administrador', 'cajero', 'mesero'] }
            },
            {
                path: 'tables',
                loadChildren: () => import('./modules/tables/tables.module').then(m => m.TablesModule),
                data: { roles: ['administrador', 'cajero', 'mesero'] }
            },
            {
                path: 'payments',
                loadChildren: () => import('./modules/payments/payments.module').then(m => m.PaymentsModule),
                data: { roles: ['administrador', 'cajero'] }
            },
            {
                path: 'reports',
                loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule),
                data: { roles: ['administrador', 'cajero'] }
            },
            {
                path: 'sucursales',
                loadChildren: () => import('./modules/sucursales/sucursales.module').then(m => m.SucursalesModule),
                data: { roles: ['administrador'] }
            }
        ]
    },
    {
        path: '**',
        component: NotFoundComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }