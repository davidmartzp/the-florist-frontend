import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { PaginatedResponse, Product } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

function slugify(name: string) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable({ providedIn: 'root' })
export class SiteProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/products`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  get(productId: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`);
  }

  // Best-effort lookup by slug: requests a larger pageSize and searches locally
  findBySlug(slug: string): Observable<Product | null> {
    return this.http.get<Product>(`${this.apiUrl}/slug/${slug}`).pipe(
      catchError(() => of(null as Product | null))
    );
  }
}
