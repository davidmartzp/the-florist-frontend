import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PaginatedResponse, Product, ProductPriceHistoryEntry } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/products`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  get(productId: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`);
  }

  getPriceHistory(productId: number): Observable<ProductPriceHistoryEntry[]> {
    return this.http.get<ProductPriceHistoryEntry[]>(`${this.apiUrl}/${productId}/price-history`);
  }

  create(payload: Record<string, unknown>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  update(productId: number, payload: Record<string, unknown>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${productId}`, payload);
  }

  remove(productId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}`);
  }
}
