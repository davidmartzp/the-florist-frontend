import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ShippingMethod } from '../models';
import { resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class SiteShippingMethodsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/shipping-methods`;

  list(): Observable<ShippingMethod[]> {
    return this.http.get<ShippingMethod[]>(this.apiUrl);
  }
}
