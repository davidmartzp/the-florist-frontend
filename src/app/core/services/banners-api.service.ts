import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Banner, PaginatedResponse } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class BannersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/banners`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Banner>> {
    return this.http.get<PaginatedResponse<Banner>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  get(bannerId: number): Observable<Banner> {
    return this.http.get<Banner>(`${this.apiUrl}/${bannerId}`);
  }

  create(payload: Record<string, unknown>): Observable<Banner> {
    return this.http.post<Banner>(this.apiUrl, payload);
  }

  update(bannerId: number, payload: Record<string, unknown>): Observable<Banner> {
    return this.http.patch<Banner>(`${this.apiUrl}/${bannerId}`, payload);
  }

  toggleActive(bannerId: number): Observable<{ message: string; isActive: boolean }> {
    return this.http.patch<{ message: string; isActive: boolean }>(`${this.apiUrl}/${bannerId}/toggle-active`, {});
  }

  uploadDesktopImage(bannerId: number, file: File): Observable<Banner> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<Banner>(`${this.apiUrl}/${bannerId}/desktop-image`, formData);
  }

  uploadMobileImage(bannerId: number, file: File): Observable<Banner> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<Banner>(`${this.apiUrl}/${bannerId}/mobile-image`, formData);
  }
}
