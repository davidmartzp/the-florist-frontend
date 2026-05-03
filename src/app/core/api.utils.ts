import { HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export function buildHttpParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        continue;
      }

      params = params.set(key, value.join(','));
      continue;
    }

    params = params.set(key, String(value));
  }

  return params;
}

export function extractErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error?: unknown }).error === 'object' &&
    (error as { error: { error?: unknown } }).error !== null &&
    'error' in (error as { error: { error?: unknown } }).error
  ) {
    const nestedError = (error as { error: { error?: unknown } }).error.error;

    if (typeof nestedError === 'string') {
      return nestedError;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}

export function resolveApiBaseUrl(): string {
  return environment.apiBaseUrl;
}
