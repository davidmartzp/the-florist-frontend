import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, forkJoin } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { AccessControlCatalog, PaginatedResponse, User } from '../../../core/models';
import { UsersApiService } from '../../../core/services/users-api.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-page.component.html',
})
export class UsersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UsersApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    firstName: this.fb.nonNullable.control('', [Validators.required]),
    lastName: this.fb.nonNullable.control('', [Validators.required]),
    password: this.fb.nonNullable.control(''),
    permissions: this.fb.nonNullable.control<string[]>([]),
  });

  protected response: PaginatedResponse<User> | null = null;
  protected accessControlCatalog: AccessControlCatalog = { permissions: [] };
  protected editingUserId: number | null = null;
  protected isFormModalOpen = false;
  protected isLoading = false;
  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(1));

    this.loadData();
  }

  protected loadData(page = this.response?.pagination.page ?? 1): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.usersApi.list({
        page,
        pageSize: this.listForm.getRawValue().pageSize,
        sortBy: this.listForm.getRawValue().sortBy,
        sortOrder: this.listForm.getRawValue().sortOrder,
      }),
      accessControl: this.usersApi.getAccessControlCatalog(),
    }).subscribe({
      next: ({ users, accessControl }) => {
        this.response = users;
        this.accessControlCatalog = accessControl;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
        this.isLoading = false;
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      email: rawValue.email,
      firstName: rawValue.firstName,
      lastName: rawValue.lastName,
      permissions: rawValue.permissions,
    };

    if (rawValue.password) {
      payload['password'] = rawValue.password;
    }

    if (!this.editingUserId && !rawValue.password) {
      this.errorMessage = 'La contraseña es obligatoria para crear usuarios.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingUserId
      ? this.usersApi.update(this.editingUserId, payload)
      : this.usersApi.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = this.editingUserId ? 'Usuario actualizado.' : 'Usuario creado.';
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected editUser(user: User): void {
    this.editingUserId = user.id;
    this.isFormModalOpen = true;
    this.form.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '',
      permissions: [...user.permissions],
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected deactivateUser(user: User): void {
    if (!confirm(`¿Desactivar a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.usersApi.deactivate(user.id).subscribe({
      next: () => {
        this.successMessage = 'Usuario desactivado.';
        this.loadData(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected togglePermission(permissionCode: string, checked: boolean): void {
    const currentPermissions = this.form.controls.permissions.getRawValue();
    const nextPermissions = checked
      ? [...new Set([...currentPermissions, permissionCode])]
      : currentPermissions.filter((permission) => permission !== permissionCode);

    this.form.controls.permissions.setValue(nextPermissions);
  }

  protected hasPermission(permissionCode: string): boolean {
    return this.form.controls.permissions.getRawValue().includes(permissionCode);
  }

  protected resetForm(): void {
    this.editingUserId = null;
    this.isFormModalOpen = false;
    this.form.reset({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      permissions: [],
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

    this.loadData(nextPage);
  }
}
