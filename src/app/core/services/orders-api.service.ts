import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Order, PaginatedResponse } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/orders`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Order>> {
    return this.http.get<PaginatedResponse<Order>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  create(payload: Record<string, unknown>): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, payload);
  }

  update(orderId: number, payload: Record<string, unknown>): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, payload);
  }

  remove(orderId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${orderId}`);
  }
}
