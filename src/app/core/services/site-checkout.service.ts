import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from '../api.utils';

export interface SiteCheckoutPayload {
  cart: Array<{ productId?: number; name?: string; quantity: number; unitPrice: number }>;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress?: string;
  cardMessage?: string;
  shippingMethodId?: number | null;
  returnUrl?: string;
}

export interface SiteCheckoutConfirmationPayload {
  preferenceId: string;
  collectionId: string;
  collectionStatus: string;
}

@Injectable({ providedIn: 'root' })
export class SiteCheckoutService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/site/checkout`;

  createPreference(payload: SiteCheckoutPayload): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  confirmPayment(payload: SiteCheckoutConfirmationPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/confirm`, payload);
  }
}
