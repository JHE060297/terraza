import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../../core/services/user.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { Usuario, Rol, Sucursal } from '../../../core/models/user.model';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-user-detail',
    imports: [sharedImports],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
    userId: number;
    user: Usuario | null = null;
    isLoading = true;
    error = '';
    roles: { [id: number]: string } = {};
    branches: { [id: number]: string } = {};

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private userService: UserService,
        private sucursalesService: SucursalService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (!idParam) {
            this.router.navigate(['/users']);
            throw new Error('User ID is required');
        }
        this.userId = +idParam;
    }

    ngOnInit(): void {
        this.loadUserData();
    }

    loadUserData(): void {
        this.isLoading = true;

        // Cargar datos del usuario
        this.userService.getUserById(this.userId)
            .pipe(
                catchError(error => {
                    this.error = 'Error al cargar datos del usuario';
                    console.error('Error loading user data', error);
                    return of(null);
                }),
                finalize(() => this.isLoading = false)
            )
            .subscribe(user => {
                this.user = user;

                // Cargar roles y sucursales para mostrar sus nombres
                this.loadRolesAndBranches();
            });
    }

    loadRolesAndBranches(): void {
        // Cargar roles
        this.userService.getRoles()
            .pipe(
                catchError(() => of([]))
            )
            .subscribe(roles => {
                this.roles = {};
                roles.forEach(role => {
                    this.roles[role.id_rol] = role.nombre;
                });
            });

        // Cargar sucursales
        this.sucursalesService.getBranches()
            .pipe(
                catchError(() => of([]))
            )
            .subscribe(branches => {
                this.branches = {};
                branches.forEach(branch => {
                    this.branches[branch.id_sucursal] = branch.nombre_sucursal;
                });
            });
    }

    getRoleName(rolId: number): string {
        return this.roles[rolId] || 'No especificado';
    }

    getBranchName(branchId: number): string {
        return this.branches[branchId] || 'No especificada';
    }

    editUser(): void {
        this.router.navigate(['/users/edit', this.userId]);
    }

    goBack(): void {
        this.router.navigate(['/users']);
    }

    deleteUser(): void {
        if (!this.user) return;

        const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Confirmar eliminación',
                message: `¿Está seguro de eliminar al usuario ${this.user.nombre} ${this.user.apellido}?`
            }
        });

        confirmDialog.afterClosed().subscribe(result => {
            if (result) {
                this.userService.deleteUser(this.userId).subscribe(
                    () => {
                        this.snackBar.open('Usuario eliminado exitosamente', 'Cerrar', {
                            duration: 3000
                        });
                        this.router.navigate(['/users']);
                    },
                    (error) => {
                        this.snackBar.open('Error al eliminar usuario', 'Cerrar', {
                            duration: 3000
                        });
                        console.error('Error deleting user', error);
                    }
                );
            }
        });
    }
}

// Dialog Component for Confirmation
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    selector: 'app-confirm-dialog',
    imports: [sharedImports],
    template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Eliminar</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { title: string, message: string }) { }
}