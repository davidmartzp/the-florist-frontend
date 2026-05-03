import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Catalog, PaginatedResponse } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class CatalogsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/catalogs`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<Catalog>> {
    return this.http.get<PaginatedResponse<Catalog>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  create(payload: Record<string, unknown>): Observable<Catalog> {
    return this.http.post<Catalog>(this.apiUrl, payload);
  }

  update(catalogId: number, payload: Record<string, unknown>): Observable<Catalog> {
    return this.http.patch<Catalog>(`${this.apiUrl}/${catalogId}`, payload);
  }

  remove(catalogId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${catalogId}`);
  }
}
