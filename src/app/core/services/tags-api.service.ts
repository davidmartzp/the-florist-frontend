import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Tag } from '../models';
import { resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class TagsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/tags`;

  create(payload: { name: string; slug?: string }): Observable<Tag> {
    return this.http.post<Tag>(this.apiUrl, payload);
  }

  remove(tagId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${tagId}`);
  }
}
