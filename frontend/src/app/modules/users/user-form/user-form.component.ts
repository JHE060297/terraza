import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { SucursalService } from '../../../core/services/sucursales.service';
import { Usuario, Rol, Sucursal } from '../../../core/models/user.model';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { sharedImports } from '../../../shared/shared.imports';

@Component({
    standalone: true,
    imports: [sharedImports],
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
    userForm: FormGroup;
    isNewUser: boolean = true;
    userId: number | null = null;
    isLoading: boolean = false;
    isSubmitting: boolean = false;
    hidePassword: boolean = true;
    roles: Rol[] = [];
    branches: Sucursal[] = [];
    error: string = '';

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private sucursalesService: SucursalService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.userForm = this.createForm();
    }

    ngOnInit(): void {
        // Determinar si es nuevo o edición basado en el URL
        const idParam = this.route.snapshot.paramMap.get('id');
        this.userId = idParam ? +idParam : null;
        this.isNewUser = !this.userId;

        // Inicializar los datos
        this.loadInitialData();
    }

    createForm(): FormGroup {
        return this.fb.group({
            nombre: ['', [Validators.required]],
            apellido: ['', [Validators.required]],
            usuario: ['', [Validators.required]],
            password: ['', this.isNewUser ? [Validators.required, Validators.minLength(6)] : []],
            id_rol: ['', [Validators.required]],
            id_sucursal: ['', [Validators.required]],
        });
    }

    loadInitialData(): void {
        this.isLoading = true;
        this.userService.getRoles()
            .subscribe({
                next: (roles) => {
                    this.roles = Array.isArray(roles) ? roles : Object.values(roles);
                    this.loadSucursales();
                },
                error: error => {
                    this.error = 'Error al cargar datos iniciales';
                    console.error('Error loading initial data', error);
                }
            });
    }

    loadSucursales(): void {
        this.sucursalesService.getBranches()
            .subscribe({
                next: (branches) => {
                    this.branches = Array.isArray(branches) ? branches : Object.values(branches);

                    if (!this.isNewUser && this.userId) {
                        this.loadUserData();
                    } else {
                        this.isLoading = false;
                    }
                },
                error: error => {
                    this.error = 'Error al cargar sucursales';
                    console.error('Error loading branches', error);
                    this.isLoading = false;
                }
            });
    }

    loadUserData(): void {
        if (!this.userId) return;

        this.userService.getUserById(this.userId).subscribe({
            next: (user) => {
                if (user) {
                    this.populateForm(user);
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading user', error);
                this.error = 'Error al cargar datos del usuario';
                this.isLoading = false;
            }
        });
    }

    populateForm(user: Usuario): void {
        this.userForm.patchValue({
            nombre: user.nombre,
            apellido: user.apellido,
            usuario: user.usuario,
            id_rol: user.id_rol,
            id_sucursal: user.id_sucursal,
        });

        // Eliminar la validación requerida del password en modo edición
        const passwordControl = this.userForm.get('password');
        if (passwordControl) {
            passwordControl.setValidators([]);
            passwordControl.updateValueAndValidity();
        }
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        const userData = this.userForm.value;

        // Si el campo password está vacío en modo edición, eliminarlo del objeto
        if (!this.isNewUser && !userData.password) {
            delete userData.password;
        }

        // Crear o actualizar usuario según corresponda
        const operation = this.isNewUser
            ? this.userService.createUser(userData)
            : this.userService.updateUser(this.userId as number, userData);

        operation.pipe(
            finalize(() => this.isSubmitting = false)
        ).subscribe({
            next: (response) => {
                this.snackBar.open(
                    this.isNewUser
                        ? 'Usuario creado exitosamente'
                        : 'Usuario actualizado exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
                this.router.navigate(['/users']);
            },
            error: (error) => {
                const errorMessage = this.isNewUser
                    ? 'Error al crear usuario'
                    : 'Error al actualizar usuario';
                this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
                console.error('Error with user operation', error);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/users']);
    }
}