import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SiteBanner } from '../models';
import { resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class SiteBannersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/banners`;

  list(): Observable<SiteBanner[]> {
    return this.http.get<SiteBanner[]>(this.apiUrl);
  }
}
