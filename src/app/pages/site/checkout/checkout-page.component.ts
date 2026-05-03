import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SiteCartService } from '../../../core/services/site-cart.service';
import { SiteCheckoutService } from '../../../core/services/site-checkout.service';
import { SiteShippingMethodsApiService } from '../../../core/services/site-shipping-methods-api.service';
import { ShippingMethod } from '../../../core/models';
import { formatPrice } from '../site-content';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
})
export class CheckoutPageComponent {
  private readonly siteCartService = inject(SiteCartService);
  private readonly siteCheckoutService = inject(SiteCheckoutService);
  private readonly shippingMethodsApi = inject(SiteShippingMethodsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly selectedShippingOptionId = signal<number | ''>('');
  private readonly shippingOptionsState = signal<ShippingMethod[]>([]);
  private readonly checkoutProcessing = signal(false);
  private readonly checkoutError = signal<string | null>(null);
  private readonly checkoutSuccess = signal<string | null>(null);
  private readonly checkoutStorageKey = 'florist-checkout-form';

  private readonly customerName = signal('');
  private readonly customerPhone = signal('');
  private readonly customerEmail = signal('');
  private readonly deliveryAddress = signal('');
  private readonly cardMessage = signal('');

  protected get selectedShippingOptionIdValue(): number | '' {
    return this.selectedShippingOptionId();
  }

  protected set selectedShippingOptionIdValue(value: number | '') {
    this.selectedShippingOptionId.set(value);
  }

  protected get checkoutFormCustomerName(): string {
    return this.customerName();
  }

  protected set checkoutFormCustomerName(value: string) {
    this.customerName.set(value);
  }

  protected get checkoutFormCustomerPhone(): string {
    return this.customerPhone();
  }

  protected set checkoutFormCustomerPhone(value: string) {
    this.customerPhone.set(value);
  }

  protected get checkoutFormCustomerEmail(): string {
    return this.customerEmail();
  }

  protected set checkoutFormCustomerEmail(value: string) {
    this.customerEmail.set(value);
  }

  protected get checkoutFormDeliveryAddress(): string {
    return this.deliveryAddress();
  }

  protected set checkoutFormDeliveryAddress(value: string) {
    this.deliveryAddress.set(value);
  }

  protected get checkoutFormCardMessage(): string {
    return this.cardMessage();
  }

  protected set checkoutFormCardMessage(value: string) {
    this.cardMessage.set(value);
  }

  protected readonly formatPrice = formatPrice;
  protected readonly items = this.siteCartService.items;
  protected readonly subtotal = this.siteCartService.subtotal;
  protected readonly isEmpty = this.siteCartService.isEmpty;
  protected readonly shippingOptions = this.shippingOptionsState.asReadonly();
  protected readonly shipping = computed(() => {
    const options = this.shippingOptions();
    const selectedId = this.selectedShippingOptionId();
    const selectedMethod = options.find((option) => option.id === selectedId) ?? options[0];
    return selectedMethod?.price ?? 0;
  });
  protected readonly total = computed(() => this.subtotal() + this.shipping());

  protected readonly isCheckoutValid = computed(() => {
    const name = this.customerName().trim();
    const phone = this.customerPhone().trim();
    const email = this.customerEmail().trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    return (
      !this.isEmpty() &&
      !!name &&
      !!phone &&
      !!email &&
      emailValid
    );
  });

  protected readonly isProcessing = this.checkoutProcessing.asReadonly();
  protected readonly errorMessage = this.checkoutError.asReadonly();
  protected readonly successMessage = this.checkoutSuccess.asReadonly();

  public constructor() {
    this.loadShippingMethods();
    this.handlePaymentReturn();
    this.restoreCheckoutFormIfNeeded();
  }

  private loadShippingMethods(): void {
    this.shippingMethodsApi.list().subscribe({
      next: (methods) => {
        const activeMethods = methods.filter((method) => method.isActive);
        this.shippingOptionsState.set(activeMethods);

        if (!this.selectedShippingOptionId() && activeMethods.length) {
          this.selectedShippingOptionId.set(activeMethods[0].id);
        }
      },
      error: () => {
        this.shippingOptionsState.set([]);
      },
    });
  }

  private handlePaymentReturn(): void {
    this.route.queryParams.subscribe((params) => {
      const isSuccess = params['paymentSuccess'] === '1' || params['paymentSuccess'] === 'true';
      const preferenceId = params['preference_id'] || params['preferenceId'];
      const collectionId = params['collection_id'] || params['collectionId'];
      const collectionStatus = params['collection_status'] || params['collectionStatus'] || params['status'];

      if (isSuccess && preferenceId && collectionId) {
        this.confirmPayment(preferenceId, collectionId, collectionStatus || 'approved');
      }
    });
  }

  protected setShippingOption(shippingOptionId: number): void {
    this.selectedShippingOptionId.set(shippingOptionId);
  }

  protected isShippingOptionSelected(shippingOptionId: number): boolean {
    return this.selectedShippingOptionId() === shippingOptionId;
  }

  protected pay(): void {
    if (this.checkoutProcessing() || !this.isCheckoutValid()) {
      this.checkoutError.set('Por favor completa todos los campos obligatorios antes de continuar.');
      return;
    }

    this.checkoutError.set(null);
    this.checkoutProcessing.set(true);

    const items = this.items();
    const invalidItem = items.find((item) => !item.id || item.id <= 0);
    if (invalidItem) {
      this.checkoutError.set('Hay productos en el carrito sin información completa. Por favor recarga la página o vuelve a agregarlos.');
      this.checkoutProcessing.set(false);
      return;
    }

    const cartItems = items.map((item) => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    }));

    const payload = {
      cart: cartItems,
      customerName: this.customerName().trim(),
      customerPhone: this.customerPhone().trim(),
      customerEmail: this.customerEmail().trim(),
      deliveryAddress: this.deliveryAddress().trim() || undefined,
      cardMessage: this.cardMessage().trim() || undefined,
      shippingMethodId: this.selectedShippingOptionId() || null,
      returnUrl: `${window.location.origin}/checkout`,
    };

    this.siteCheckoutService.createPreference(payload).subscribe({
      next: (response) => {
        if (!response?.init_point) {
          this.checkoutError.set('No se pudo iniciar el pago de MercadoPago.');
          this.checkoutProcessing.set(false);
          return;
        }

        this.saveCheckoutForm();
        window.location.href = response.init_point;
      },
      error: (error) => {
        const message = error?.error?.error || error?.message || 'Error al procesar el pago. Intenta de nuevo.';
        this.checkoutError.set(message);
        this.checkoutProcessing.set(false);
      },
    });
  }

  private confirmPayment(preferenceId: string, collectionId: string, collectionStatus: string): void {
    if (this.checkoutProcessing()) {
      return;
    }

    this.checkoutError.set(null);
    this.checkoutProcessing.set(true);

    this.siteCheckoutService
      .confirmPayment({ preferenceId, collectionId, collectionStatus })
      .subscribe({
        next: (order) => {
          this.siteCartService.clear();
          this.clearCheckoutForm();
          this.checkoutSuccess.set(`Tu pedido se registró correctamente. Número de orden: ${order.code}`);
          this.clearReturnQueryParams();
        },
        error: (error) => {
          const message = error?.error?.error || error?.message || 'No se pudo confirmar el pago. Intenta de nuevo.';
          this.checkoutError.set(message);
          this.clearReturnQueryParams();
        },
        complete: () => {
          this.checkoutProcessing.set(false);
        },
      });
  }

  private clearReturnQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private saveCheckoutForm(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const data = {
      customerName: this.customerName(),
      customerPhone: this.customerPhone(),
      customerEmail: this.customerEmail(),
      deliveryAddress: this.deliveryAddress(),
      cardMessage: this.cardMessage(),
      shippingOptionId: this.selectedShippingOptionId(),
    };
    localStorage.setItem(this.checkoutStorageKey, JSON.stringify(data));
  }

  private restoreCheckoutFormIfNeeded(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const raw = localStorage.getItem(this.checkoutStorageKey);
    if (!raw) {
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (typeof data.customerName === 'string') {
        this.customerName.set(data.customerName);
      }
      if (typeof data.customerPhone === 'string') {
        this.customerPhone.set(data.customerPhone);
      }
      if (typeof data.customerEmail === 'string') {
        this.customerEmail.set(data.customerEmail);
      }
      if (typeof data.deliveryAddress === 'string') {
        this.deliveryAddress.set(data.deliveryAddress);
      }
      if (typeof data.cardMessage === 'string') {
        this.cardMessage.set(data.cardMessage);
      }
      if (typeof data.shippingOptionId === 'number' || data.shippingOptionId === '') {
        this.selectedShippingOptionId.set(data.shippingOptionId);
      }
    } catch {
      // ignore corrupt storage
    }
  }

  private clearCheckoutForm(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.removeItem(this.checkoutStorageKey);
  }
}
