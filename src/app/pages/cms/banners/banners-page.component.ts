import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, debounceTime, forkJoin, of } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Banner, PaginatedResponse } from '../../../core/models';
import { BannersApiService } from '../../../core/services/banners-api.service';
import { SwalService } from '../../../core/services/swal.service';

type ImageSlot = 'desktop' | 'mobile';

@Component({
  selector: 'app-banners-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './banners-page.component.html',
})
export class BannersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bannersApi = inject(BannersApiService);
  private readonly swal = inject(SwalService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    sortBy: 'sortOrder',
    sortOrder: 'asc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    sortOrder: 0,
  });

  protected response: PaginatedResponse<Banner> | null = null;
  protected editingBannerId: number | null = null;
  protected editingBannerTitle: string | null = null;
  protected isFormModalOpen = false;
  protected desktopPreviewUrl: string | null = null;
  protected mobilePreviewUrl: string | null = null;
  private pendingDesktopFile: File | null = null;
  private pendingMobileFile: File | null = null;

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(1));

    this.loadData();
  }

  protected loadData(page = this.response?.pagination.page ?? 1): void {
    this.bannersApi.list({
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
    const isCreating = this.editingBannerId === null;
    const pendingDesktopFile = isCreating ? this.pendingDesktopFile : null;
    const pendingMobileFile = isCreating ? this.pendingMobileFile : null;

    const request$ = this.editingBannerId
      ? this.bannersApi.update(this.editingBannerId, payload)
      : this.bannersApi.create(payload);

    request$.subscribe({
      next: (banner: Banner) => {
        if (pendingDesktopFile || pendingMobileFile) {
          this.uploadPendingImages(banner.id, pendingDesktopFile, pendingMobileFile).subscribe({
            next: () => {
              this.swal.success(`Banner "${banner.title}" creado.`);
              this.resetForm();
              this.loadData();
            },
            error: (error) => {
              this.swal.error(extractErrorMessage(error));
              this.resetForm();
              this.loadData();
            },
          });
          return;
        }

        this.swal.success(this.editingBannerId
          ? `Banner "${banner.title}" actualizado.`
          : `Banner "${banner.title}" creado.`);
        this.resetForm();
        this.loadData();
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  private uploadPendingImages(bannerId: number, desktopFile: File | null, mobileFile: File | null): Observable<unknown> {
    const uploads: Observable<Banner>[] = [];
    if (desktopFile) {
      uploads.push(this.bannersApi.uploadDesktopImage(bannerId, desktopFile));
    }
    if (mobileFile) {
      uploads.push(this.bannersApi.uploadMobileImage(bannerId, mobileFile));
    }
    return uploads.length ? forkJoin(uploads) : of(null);
  }

  protected onDesktopImageSelected(event: Event): void {
    this.onImageSelected(event, 'desktop');
  }

  protected onMobileImageSelected(event: Event): void {
    this.onImageSelected(event, 'mobile');
  }

  private onImageSelected(event: Event, slot: ImageSlot): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (this.editingBannerId) {
      const bannerId = this.editingBannerId;
      const upload$ = slot === 'desktop'
        ? this.bannersApi.uploadDesktopImage(bannerId, file)
        : this.bannersApi.uploadMobileImage(bannerId, file);

      upload$.subscribe({
        next: (banner) => {
          this.setPreview(slot, slot === 'desktop' ? banner.desktopImage : banner.mobileImage);
          this.swal.success('Imagen actualizada.');
        },
        error: (error) => {
          this.swal.error(extractErrorMessage(error));
        },
      });
      input.value = '';
      return;
    }

    if (slot === 'desktop') {
      this.pendingDesktopFile = file;
    } else {
      this.pendingMobileFile = file;
    }
    this.setPreview(slot, URL.createObjectURL(file));
  }

  private setPreview(slot: ImageSlot, url: string | null): void {
    const current = slot === 'desktop' ? this.desktopPreviewUrl : this.mobilePreviewUrl;
    if (current?.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
    if (slot === 'desktop') {
      this.desktopPreviewUrl = url;
    } else {
      this.mobilePreviewUrl = url;
    }
  }

  protected editBanner(banner: Banner): void {
    this.editingBannerId = banner.id;
    this.editingBannerTitle = banner.title;
    this.isFormModalOpen = true;
    this.pendingDesktopFile = null;
    this.pendingMobileFile = null;
    this.setPreview('desktop', banner.desktopImage);
    this.setPreview('mobile', banner.mobileImage);
    this.form.reset({
      title: banner.title,
      sortOrder: banner.sortOrder,
    });
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected async toggleBannerActive(banner: Banner): Promise<void> {
    const action = banner.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} el banner "${banner.title}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.bannersApi.toggleActive(banner.id).subscribe({
      next: () => {
        this.swal.success(`Banner "${banner.title}" ${banner.isActive ? 'desactivado' : 'activado'}.`);
        this.loadData(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected resetForm(): void {
    this.editingBannerId = null;
    this.editingBannerTitle = null;
    this.isFormModalOpen = false;
    this.pendingDesktopFile = null;
    this.pendingMobileFile = null;
    this.setPreview('desktop', null);
    this.setPreview('mobile', null);
    this.form.reset({ title: '', sortOrder: 0 });
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
