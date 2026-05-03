import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class SiteCartApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/cart`;

  listComplements(hasGeneral: boolean): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/complements`, {
      params: buildHttpParams({ hasGeneral }),
    });
  }

  validateCartItem(productSlug: string, cartItemSlugs: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items`, { productSlug, cartItemSlugs });
  }
}
