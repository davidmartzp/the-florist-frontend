import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Category, PaginatedResponse } from '../../../core/models';
import { CategoriesApiService } from '../../../core/services/categories-api.service';
import { SwalService } from '../../../core/services/swal.service';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories-page.component.html',
})
export class CategoriesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly swal = inject(SwalService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    slug: this.fb.nonNullable.control(''),
    description: this.fb.nonNullable.control(''),
  });

  protected response: PaginatedResponse<Category> | null = null;
  protected editingCategoryId: number | null = null;
  protected editingCategoryName: string | null = null;
  protected isFormModalOpen = false;

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(1));

    this.loadData();
  }

  protected loadData(page = this.response?.pagination.page ?? 1): void {
    this.categoriesApi.list({
      page,
      pageSize: this.listForm.getRawValue().pageSize,
      sortBy: this.listForm.getRawValue().sortBy,
      sortOrder: this.listForm.getRawValue().sortOrder,
    }).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const request$ = this.editingCategoryId
      ? this.categoriesApi.update(this.editingCategoryId, payload)
      : this.categoriesApi.create(payload);

    request$.subscribe({
      next: (category: Category) => {
        this.swal.success(this.editingCategoryId
          ? `Categoría "${category.name}" actualizada.`
          : `Categoría "${category.name}" creada.`);
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected editCategory(category: Category): void {
    this.editingCategoryId = category.id;
    this.editingCategoryName = category.name;
    this.isFormModalOpen = true;
    this.form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected async toggleCategoryActive(category: Category): Promise<void> {
    const action = category.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} la categoría "${category.name}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.categoriesApi.toggleActive(category.id).subscribe({
      next: () => {
        this.swal.success(`Categoría "${category.name}" ${category.isActive ? 'desactivada' : 'activada'}.`);
        this.loadData(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected resetForm(): void {
    this.editingCategoryId = null;
    this.editingCategoryName = null;
    this.isFormModalOpen = false;
    this.form.reset({ name: '', slug: '', description: '' });
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
