import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { Usuario } from '../../../core/models/user.model';
import { Router } from '@angular/router';

@Component({
    standalone: true,
    imports: [sharedImports],
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
    dataSource = new MatTableDataSource<Usuario>([]);
    displayedColumns: string[] = ['id_usuario', 'nombre', 'apellido', 'usuario', 'rol_nombre', 'sucursal_nombre', 'is_active', 'actions'];
    isLoading = true;
    error = '';

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private userService: UserService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadUsers() {
        this.isLoading = true;
        this.userService.getUsers().subscribe(
            (users) => {
                this.dataSource.data = users;
                this.isLoading = false;
            },
            (error) => {
                this.error = 'Error al cargar usuarios';
                console.error('Error loading users', error);
                this.isLoading = false;
            }
        );
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    addUser() {
        this.router.navigate(['/users/new']);
    }

    editUser(user: Usuario) {
        this.router.navigate(['/users/edit', user.id_usuario]);
    }

    viewUserDetails(user: Usuario) {
        this.router.navigate(['/users', user.id_usuario]);
    }

    deleteUser(user: Usuario) {
        const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Confirmar eliminación',
                message: `¿Está seguro de eliminar al usuario ${user.nombre} ${user.apellido}?`
            }
        });

        confirmDialog.afterClosed().subscribe(result => {
            if (result) {
                this.userService.deleteUser(user.id_usuario).subscribe(
                    () => {
                        this.dataSource.data = this.dataSource.data.filter(u => u.id_usuario !== user.id_usuario);
                        this.snackBar.open('Usuario eliminado exitosamente', 'Cerrar', {
                            duration: 3000
                        });
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
@Component({
    standalone: true,
    imports: [sharedImports],
    selector: 'app-confirm-dialog',
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

// We need to import Inject and MAT_DIALOG_DATA for the dialog component
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared.imports';
