import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Category } from '../models';
import { resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class SiteCategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/categories`;

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }
}
