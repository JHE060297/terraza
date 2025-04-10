import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { UsersListComponent } from './users-list/users-list.component';
import { UserFormComponent } from './user-form/user-form.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: UsersListComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'new',
    component: UserFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'edit/:id',
    component: UserFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: ':id',
    component: UserDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] }
  }
];

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    UsersListComponent,
    UserFormComponent,
    UserDetailComponent,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class UsersModule { }