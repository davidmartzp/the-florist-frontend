import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Category, PaginatedResponse } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/categories`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  create(payload: Record<string, unknown>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, payload);
  }

  update(categoryId: number, payload: Record<string, unknown>): Observable<Category> {
    return this.http.patch<Category>(`${this.apiUrl}/${categoryId}`, payload);
  }

  remove(categoryId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${categoryId}`);
  }
}
