import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PaginatedResponse, ShippingMethod } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class ShippingMethodsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/shipping-methods`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<ShippingMethod>> {
    return this.http.get<PaginatedResponse<ShippingMethod>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  create(payload: Record<string, unknown>): Observable<ShippingMethod> {
    return this.http.post<ShippingMethod>(this.apiUrl, payload);
  }

  update(shippingMethodId: number, payload: Record<string, unknown>): Observable<ShippingMethod> {
    return this.http.patch<ShippingMethod>(`${this.apiUrl}/${shippingMethodId}`, payload);
  }

  toggleActive(shippingMethodId: number): Observable<{ message: string; isActive: boolean }> {
    return this.http.patch<{ message: string; isActive: boolean }>(`${this.apiUrl}/${shippingMethodId}/toggle-active`, {});
  }
}
