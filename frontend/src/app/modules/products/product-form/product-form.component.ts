import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared.imports';
import { InventoryService } from '../../../core/services/inventory.service';
import { Producto } from '../../../core/models/inventory.model';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-product-form',
    standalone: true,
    imports: [sharedImports],
    templateUrl: './product-form.component.html',
    styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
    productForm: FormGroup;
    isNewProduct: boolean = true;
    productId: number | null = null;
    isLoading: boolean = false;
    isSubmitting: boolean = false;
    error: string = '';
    imagePreview: string | ArrayBuffer | null = null;

    constructor(
        private fb: FormBuilder,
        private inventoryService: InventoryService,
        private route: ActivatedRoute,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.productForm = this.createForm();
    }

    ngOnInit(): void {
        // Determinar si es nuevo o edición basado en el URL
        const idParam = this.route.snapshot.paramMap.get('id');
        this.productId = idParam ? +idParam : null;
        this.isNewProduct = !this.productId;

        // Si es edición, cargar los datos del producto
        if (!this.isNewProduct && this.productId) {
            this.loadProductData();
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            nombre_producto: ['', [Validators.required]],
            descripcion: [''],
            precio_compra: [0, [Validators.required, Validators.min(0)]],
            precio_venta: [0, [Validators.required, Validators.min(0)]],
            image: [null],
            is_active: [true]
        });
    }

    loadProductData(): void {
        if (!this.productId) return;

        this.isLoading = true;
        this.inventoryService.getProductById(this.productId)
            .pipe(
                finalize(() => this.isLoading = false)
            )
            .subscribe({
                next: (product) => {
                    this.populateForm(product);
                    if (product.image) {
                        this.imagePreview = product.image;
                    }
                },
                error: (error) => {
                    console.error('Error loading product data', error);
                    this.error = 'Error al cargar datos del producto';
                }
            });
    }

    populateForm(product: Producto): void {
        this.productForm.patchValue({
            nombre_producto: product.nombre_producto,
            descripcion: product.descripcion || '',
            precio_compra: product.precio_compra,
            precio_venta: product.precio_venta,
            is_active: product.is_active
        });
    }

    onSubmit(): void {
        if (this.productForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        const productData = this.prepareFormData();

        // Crear o actualizar producto según corresponda
        const operation = this.isNewProduct
            ? this.inventoryService.createProduct(productData)
            : this.inventoryService.updateProduct(this.productId as number, productData);

        operation.pipe(
            finalize(() => this.isSubmitting = false)
        ).subscribe({
            next: (response) => {
                this.snackBar.open(
                    this.isNewProduct
                        ? 'Producto creado exitosamente'
                        : 'Producto actualizado exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
                this.router.navigate(['/products']);
            },
            error: (error) => {
                const errorMessage = this.isNewProduct
                    ? 'Error al crear producto'
                    : 'Error al actualizar producto';
                this.snackBar.open(errorMessage, 'Cerrar', { duration: 5000 });
                console.error('Error with product operation', error);
            }
        });
    }

    prepareFormData(): any {
        // Para manejo de formularios con archivos, usaremos FormData
        const formData = new FormData();
        const formValue = this.productForm.value;

        // Agregar campos de texto
        formData.append('nombre_producto', formValue.nombre_producto);
        formData.append('descripcion', formValue.descripcion || '');
        formData.append('precio_compra', formValue.precio_compra);
        formData.append('precio_venta', formValue.precio_venta);
        formData.append('is_active', formValue.is_active);

        // Agregar imagen si existe
        if (formValue.image instanceof File) {
            formData.append('image', formValue.image);
        }

        return formData;
    }

    onImageSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length) {
            const file = input.files[0];

            // Guardar archivo en el formulario
            this.productForm.patchValue({ image: file });

            // Crear preview
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result;
            };
            reader.readAsDataURL(file);
        }
    }

    onCancel(): void {
        this.router.navigate(['/products']);
    }
}