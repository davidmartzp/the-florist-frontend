import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AccessControlCatalog, PaginatedResponse, User } from '../models';
import { buildHttpParams, resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/users`;

  list(query: Record<string, unknown>): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params: buildHttpParams(query) });
  }

  getAccessControlCatalog(): Observable<AccessControlCatalog> {
    return this.http.get<AccessControlCatalog>(`${this.apiUrl}/access-control`);
  }

  create(payload: Record<string, unknown>): Observable<User> {
    return this.http.post<User>(this.apiUrl, payload);
  }

  update(userId: number, payload: Record<string, unknown>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, payload);
  }

  deactivate(userId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/deactivate`, {});
  }
}
