import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { LoginResponse, User } from '../models';
import { resolveApiBaseUrl } from '../api.utils';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = resolveApiBaseUrl();
  private readonly storageTokenKey = 'florist.token';
  private readonly storageUserKey = 'florist.user';

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(this.storageTokenKey));
  private readonly userSignal = signal<User | null>(this.readUser());

  readonly token = computed(() => this.tokenSignal());
  readonly currentUser = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal() && this.userSignal()));

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response) => this.persistSession(response.token, response.user))
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageTokenKey);
    localStorage.removeItem(this.storageUserKey);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigate(['/admin-flowers/login']);
  }

  hasPermission(permission: string): boolean {
    return this.userSignal()?.permissions.includes(permission) ?? false;
  }

  private persistSession(token: string, user: User): void {
    localStorage.setItem(this.storageTokenKey, token);
    localStorage.setItem(this.storageUserKey, JSON.stringify(user));
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  private readUser(): User | null {
    const rawUser = localStorage.getItem(this.storageUserKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      localStorage.removeItem(this.storageUserKey);
      return null;
    }
  }
}
