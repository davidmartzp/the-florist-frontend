import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, forkJoin } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Catalog, Category, PaginatedResponse, Product, ProductPriceHistoryEntry, Tag } from '../../../core/models';
import { CatalogsApiService } from '../../../core/services/catalogs-api.service';
import { CategoriesApiService } from '../../../core/services/categories-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { SwalService } from '../../../core/services/swal.service';
import { TagsApiService } from '../../../core/services/tags-api.service';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products-page.component.html',
})
export class ProductsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly catalogsApi = inject(CatalogsApiService);
  private readonly tagsApi = inject(TagsApiService);
  private readonly swal = inject(SwalService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    q: '',
    inStock: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: 'GENERAL' as 'GENERAL' | 'COMPLEMENT' | 'MEMBERSHIP',
    price: 0,
    hasVat: true,
    vatRate: 19,
    stock: 0,
    description: '',
    image: '',
    categoryIds: this.fb.nonNullable.control<number[]>([]),
    catalogIds: this.fb.nonNullable.control<number[]>([]),
    tagIds: this.fb.nonNullable.control<number[]>([]),
  });

  protected readonly tagForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
  });

  protected response: PaginatedResponse<Product> | null = null;
  protected categories: Category[] = [];
  protected catalogs: Catalog[] = [];
  protected availableTags: Tag[] = [];
  protected priceHistory: ProductPriceHistoryEntry[] = [];
  protected editingProductId: number | null = null;
  protected editingProductName: string | null = null;
  protected isFormModalOpen = false;
  protected isLoading = false;
  protected imagePreviewUrl: string | null = null;
  private pendingImageFile: File | null = null;

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProducts(1));

    this.loadReferenceData();
    this.loadProducts();
  }

  protected loadReferenceData(): void {
    forkJoin({
      categories: this.categoriesApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
      catalogs: this.catalogsApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
    }).subscribe({
      next: ({ categories, catalogs }) => {
        this.categories = categories.items;
        this.catalogs = catalogs.items;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected loadProducts(page = this.response?.pagination.page ?? 1): void {
    this.isLoading = true;
    this.productsApi.list({
      page,
      pageSize: this.listForm.getRawValue().pageSize,
      q: this.listForm.getRawValue().q,
      inStock: this.listForm.getRawValue().inStock,
      sortBy: this.listForm.getRawValue().sortBy,
      sortOrder: this.listForm.getRawValue().sortOrder,
    }).subscribe({
      next: (response) => {
        this.response = response;
        this.availableTags = this.mergeTags(response.items.flatMap((product) => product.tags));
        this.isLoading = false;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
        this.isLoading = false;
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload = {
      ...rawValue,
      price: Number(rawValue.price),
      vatRate: Number(rawValue.vatRate),
      stock: Number(rawValue.stock),
      description: rawValue.description || null,
      image: rawValue.image || null,
    };

    const isCreating = this.editingProductId === null;
    const imageFileToUpload = isCreating ? this.pendingImageFile : null;

    const request$ = this.editingProductId
      ? this.productsApi.update(this.editingProductId, payload)
      : this.productsApi.create(payload);

    request$.subscribe({
      next: (product: Product) => {
        if (imageFileToUpload) {
          this.productsApi.uploadImage(product.id, imageFileToUpload).subscribe({
            next: () => {
              this.swal.success(`Producto "${product.name}" creado.`);
              this.resetForm();
              this.loadProducts();
            },
            error: (error) => {
              this.swal.error(extractErrorMessage(error));
              this.resetForm();
              this.loadProducts();
            },
          });
          return;
        }

        this.swal.success(this.editingProductId
          ? `Producto "${product.name}" actualizado.`
          : `Producto "${product.name}" creado.`);
        this.resetForm();
        this.loadProducts();
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (this.editingProductId) {
      this.productsApi.uploadImage(this.editingProductId, file).subscribe({
        next: (product) => {
          this.form.controls.image.setValue(product.image ?? '');
          this.setImagePreview(product.image);
          this.swal.success('Imagen actualizada.');
        },
        error: (error) => {
          this.swal.error(extractErrorMessage(error));
        },
      });
      input.value = '';
      return;
    }

    this.pendingImageFile = file;
    this.setImagePreview(URL.createObjectURL(file));
  }

  private setImagePreview(url: string | null): void {
    if (this.imagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = url;
  }

  protected editProduct(product: Product): void {
    this.editingProductId = product.id;
    this.editingProductName = product.name;
    this.isFormModalOpen = true;
    this.pendingImageFile = null;
    this.setImagePreview(product.image);
    this.form.reset({
      name: product.name,
      type: product.type,
      price: product.price,
      hasVat: product.hasVat,
      vatRate: product.vatRate,
      stock: product.stock,
      description: product.description ?? '',
      image: product.image ?? '',
      categoryIds: product.categories.map((category) => category.id),
      catalogIds: product.catalogs.map((catalog) => catalog.id),
      tagIds: product.tags.map((tag) => tag.id),
    });
    this.availableTags = this.mergeTags([...this.availableTags, ...product.tags]);
    this.productsApi.getPriceHistory(product.id).subscribe({
      next: (history) => {
        this.priceHistory = history;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected async toggleProductActive(product: Product): Promise<void> {
    const action = product.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} el producto "${product.name}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.productsApi.toggleActive(product.id).subscribe({
      next: () => {
        this.swal.success(`Producto "${product.name}" ${product.isActive ? 'desactivado' : 'activado'}.`);
        this.loadProducts(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected createTag(): void {
    if (this.tagForm.invalid) {
      this.tagForm.markAllAsTouched();
      return;
    }

    this.tagsApi.create({ name: this.tagForm.getRawValue().name }).subscribe({
      next: (tag) => {
        this.availableTags = this.mergeTags([...this.availableTags, tag]);
        this.toggleArraySelection('tagIds', tag.id, true);
        this.tagForm.reset({ name: '' });
        this.swal.success(`Tag "${tag.name}" creado.`);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected async toggleTagActive(tag: Tag): Promise<void> {
    const action = tag.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} el tag "${tag.name}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.tagsApi.toggleActive(tag.id).subscribe({
      next: () => {
        this.availableTags = this.availableTags.map((item) =>
          item.id === tag.id ? { ...item, isActive: !tag.isActive } : item
        );
        this.swal.success(`Tag "${tag.name}" ${tag.isActive ? 'desactivado' : 'activado'}.`);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected toggleArraySelection(controlName: 'categoryIds' | 'catalogIds' | 'tagIds', value: number, checked: boolean): void {
    const currentValues = this.form.controls[controlName].getRawValue() as number[];
    const nextValues = checked
      ? [...new Set([...currentValues, value])]
      : currentValues.filter((currentValue) => currentValue !== value);

    this.form.controls[controlName].setValue(nextValues);
  }

  protected hasSelection(controlName: 'categoryIds' | 'catalogIds' | 'tagIds', value: number): boolean {
    return (this.form.controls[controlName].getRawValue() as number[]).includes(value);
  }

  protected resetListFilters(): void {
    this.listForm.reset({
      q: '',
      inStock: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      pageSize: 10,
    }, { emitEvent: true });
  }

  protected resetForm(): void {
    this.editingProductId = null;
    this.editingProductName = null;
    this.isFormModalOpen = false;
    this.priceHistory = [];
    this.pendingImageFile = null;
    this.setImagePreview(null);
    this.form.reset({
      name: '',
      type: 'GENERAL',
      price: 0,
      hasVat: true,
      vatRate: 19,
      stock: 0,
      description: '',
      image: '',
      categoryIds: [],
      catalogIds: [],
      tagIds: [],
    });
  }

  protected changePage(direction: number): void {
    if (!this.response) {
      return;
    }

    const nextPage = this.response.pagination.page + direction;
    if (nextPage < 1 || nextPage > this.response.pagination.totalPages) {
      return;
    }

    this.loadProducts(nextPage);
  }

  private mergeTags(tags: Tag[]): Tag[] {
    const tagsById = new Map<number, Tag>();
    for (const tag of tags) {
      tagsById.set(tag.id, tag);
    }
    return [...tagsById.values()].sort((left, right) => left.name.localeCompare(right.name));
  }
}
