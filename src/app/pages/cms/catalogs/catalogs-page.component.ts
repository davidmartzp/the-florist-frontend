import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Catalog, PaginatedResponse } from '../../../core/models';
import { CatalogsApiService } from '../../../core/services/catalogs-api.service';

@Component({
  selector: 'app-catalogs-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogs-page.component.html',
})
export class CatalogsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogsApi = inject(CatalogsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    slug: [''],
    description: [''],
    isActive: true,
  });

  protected response: PaginatedResponse<Catalog> | null = null;
  protected editingCatalogId: number | null = null;
  protected editingCatalogName: string | null = null;
  protected isFormModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(1));

    this.loadData();
  }

  protected loadData(page = this.response?.pagination.page ?? 1): void {
    this.catalogsApi.list({
      page,
      pageSize: this.listForm.getRawValue().pageSize,
      sortBy: this.listForm.getRawValue().sortBy,
      sortOrder: this.listForm.getRawValue().sortOrder,
    }).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const request$ = this.editingCatalogId
      ? this.catalogsApi.update(this.editingCatalogId, payload)
      : this.catalogsApi.create(payload);

    request$.subscribe({
      next: (catalog: Catalog) => {
        this.successMessage = this.editingCatalogId
          ? `Catálogo "${catalog.name}" actualizado.`
          : `Catálogo "${catalog.name}" creado.`;
        this.errorMessage = '';
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected editCatalog(catalog: Catalog): void {
    this.editingCatalogId = catalog.id;
    this.editingCatalogName = catalog.name;
    this.isFormModalOpen = true;
    this.form.reset({
      name: catalog.name,
      slug: catalog.slug,
      description: catalog.description ?? '',
      isActive: catalog.isActive,
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected deleteCatalog(catalog: Catalog): void {
    if (!confirm(`¿Eliminar el catálogo ${catalog.name}?`)) {
      return;
    }

    this.catalogsApi.remove(catalog.id).subscribe({
      next: () => {
        this.successMessage = 'Catálogo eliminado.';
        this.loadData(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected resetForm(): void {
    this.editingCatalogId = null;
    this.editingCatalogName = null;
    this.isFormModalOpen = false;
    this.form.reset({ name: '', slug: '', description: '', isActive: true });
  }

  protected changePage(direction: number): void {
    if (!this.response) {
      
      return;
    }

    const nextPage = this.response.pagination.page + direction;
    if (nextPage < 1 || nextPage > this.response.pagination.totalPages) {
      return;
    }

    this.loadData(nextPage);
  }
}
