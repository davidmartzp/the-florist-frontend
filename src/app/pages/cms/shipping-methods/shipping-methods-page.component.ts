import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { PaginatedResponse, ShippingMethod } from '../../../core/models';
import { ShippingMethodsApiService } from '../../../core/services/shipping-methods-api.service';
import { SwalService } from '../../../core/services/swal.service';

@Component({
  selector: 'app-shipping-methods-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shipping-methods-page.component.html',
})
export class ShippingMethodsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly shippingMethodsApi = inject(ShippingMethodsApiService);
  private readonly swal = inject(SwalService);
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
    price: [''],
    isActive: true,
  });

  protected response: PaginatedResponse<ShippingMethod> | null = null;
  protected editingShippingMethodId: number | null = null;
  protected editingShippingMethodName: string | null = null;
  protected isFormModalOpen = false;

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(1));

    this.loadData();
  }

  protected loadData(page = this.response?.pagination.page ?? 1): void {
    this.shippingMethodsApi.list({
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

    const rawValue = this.form.getRawValue();
    const payload = {
      ...rawValue,
      price: rawValue.price === '' ? null : Number(rawValue.price),
    };
    const request$ = this.editingShippingMethodId
      ? this.shippingMethodsApi.update(this.editingShippingMethodId, payload)
      : this.shippingMethodsApi.create(payload);

    request$.subscribe({
      next: (shippingMethod: ShippingMethod) => {
        this.swal.success(this.editingShippingMethodId
          ? `Método "${shippingMethod.name}" actualizado.`
          : `Método "${shippingMethod.name}" creado.`);
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected editShippingMethod(shippingMethod: ShippingMethod): void {
    this.editingShippingMethodId = shippingMethod.id;
    this.editingShippingMethodName = shippingMethod.name;
    this.isFormModalOpen = true;
    this.form.reset({
      name: shippingMethod.name,
      slug: shippingMethod.slug,
      description: shippingMethod.description ?? '',
      price: shippingMethod.price === null ? '' : String(shippingMethod.price),
      isActive: shippingMethod.isActive,
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected async toggleShippingMethodActive(shippingMethod: ShippingMethod): Promise<void> {
    const action = shippingMethod.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} el método "${shippingMethod.name}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.shippingMethodsApi.toggleActive(shippingMethod.id).subscribe({
      next: () => {
        this.swal.success(`Método "${shippingMethod.name}" ${shippingMethod.isActive ? 'desactivado' : 'activado'}.`);
        this.loadData(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected resetForm(): void {
    this.editingShippingMethodId = null;
    this.editingShippingMethodName = null;
    this.isFormModalOpen = false;
    this.form.reset({ name: '', slug: '', description: '', price: '', isActive: true });
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
