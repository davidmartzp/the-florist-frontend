import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SiteCartService } from '../../../core/services/site-cart.service';
import { SiteCheckoutService } from '../../../core/services/site-checkout.service';
import { SiteShippingMethodsApiService } from '../../../core/services/site-shipping-methods-api.service';
import { ShippingMethod } from '../../../core/models';
import { formatPrice } from '../site-content';

type BillingDocumentType = 'CC' | 'CE' | 'NIT' | 'PASAPORTE' | '';

interface CheckoutFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  billingDocument: string;
  billingDocumentType: BillingDocumentType;
  billingCity: string;
  billingAddress: string;
  deliveryAddress: string;
  shippingOptionId: number | '';
  includesCard: boolean;
  cardMessage: string;
  receiverName: string;
  receiverPhone: string;
  cardSignature: string;
  deliveryDate: string;
}

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
  private readonly checkoutProcessing = signal(false);
  private readonly checkoutError = signal<string | null>(null);
  private readonly checkoutSuccess = signal<string | null>(null);
  private readonly checkoutStorageKey = 'florist-checkout-form';

  private readonly shippingOptionsState = signal<ShippingMethod[]>([]);

  protected readonly billingDocumentTypes: BillingDocumentType[] = ['CC', 'CE', 'NIT', 'PASAPORTE'];

  // Step 1: Billing
  private readonly customerName = signal('');
  private readonly customerPhone = signal('');
  private readonly customerEmail = signal('');
  private readonly billingDocument = signal('');
  private readonly billingDocumentType = signal<BillingDocumentType>('');
  private readonly billingCity = signal('');
  private readonly billingAddress = signal('');
  private readonly deliveryAddress = signal('');

  // Step 2: Shipping
  private readonly selectedShippingOptionId = signal<number | ''>('');

  // Step 3: Receiver / Card
  protected readonly includesCard = signal(true);
  private readonly cardMessage = signal('');
  private readonly receiverName = signal('');
  private readonly receiverPhone = signal('');
  private readonly cardSignature = signal('');
  private readonly deliveryDate = signal('');

  // Stepper state
  private readonly currentStep = signal(1);

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

  protected get checkoutFormBillingDocument(): string {
    return this.billingDocument();
  }
  protected set checkoutFormBillingDocument(value: string) {
    this.billingDocument.set(value);
  }

  protected get checkoutFormBillingDocumentType(): BillingDocumentType {
    return this.billingDocumentType();
  }
  protected set checkoutFormBillingDocumentType(value: BillingDocumentType) {
    this.billingDocumentType.set(value);
  }

  protected get checkoutFormBillingCity(): string {
    return this.billingCity();
  }
  protected set checkoutFormBillingCity(value: string) {
    this.billingCity.set(value);
  }

  protected get checkoutFormBillingAddress(): string {
    return this.billingAddress();
  }
  protected set checkoutFormBillingAddress(value: string) {
    this.billingAddress.set(value);
  }

  protected get checkoutFormDeliveryAddress(): string {
    return this.deliveryAddress();
  }
  protected set checkoutFormDeliveryAddress(value: string) {
    this.deliveryAddress.set(value);
  }

  protected get selectedShippingOptionIdValue(): number | '' {
    return this.selectedShippingOptionId();
  }
  protected set selectedShippingOptionIdValue(value: number | '') {
    this.selectedShippingOptionId.set(value);
  }

  protected get checkoutFormIncludesCard(): boolean {
    return this.includesCard();
  }
  protected set checkoutFormIncludesCard(value: boolean) {
    this.includesCard.set(value);
  }

  protected get checkoutFormCardMessage(): string {
    return this.cardMessage();
  }
  protected set checkoutFormCardMessage(value: string) {
    this.cardMessage.set(value);
  }

  protected get checkoutFormReceiverName(): string {
    return this.receiverName();
  }
  protected set checkoutFormReceiverName(value: string) {
    this.receiverName.set(value);
  }

  protected get checkoutFormReceiverPhone(): string {
    return this.receiverPhone();
  }
  protected set checkoutFormReceiverPhone(value: string) {
    this.receiverPhone.set(value);
  }

  protected get checkoutFormCardSignature(): string {
    return this.cardSignature();
  }
  protected set checkoutFormCardSignature(value: string) {
    this.cardSignature.set(value);
  }

  protected get checkoutFormDeliveryDate(): string {
    return this.deliveryDate();
  }
  protected set checkoutFormDeliveryDate(value: string) {
    this.deliveryDate.set(value);
  }

  protected readonly formatPrice = formatPrice;
  protected readonly items = this.siteCartService.items;
  protected readonly subtotal = this.siteCartService.subtotal;
  protected readonly isEmpty = this.siteCartService.isEmpty;
  protected readonly shippingOptions = this.shippingOptionsState.asReadonly();
  protected readonly step = this.currentStep.asReadonly();

  protected readonly shipping = computed(() => {
    const options = this.shippingOptions();
    const selectedId = this.selectedShippingOptionId();
    const selectedMethod = options.find((option) => option.id === selectedId) ?? options[0];
    return selectedMethod?.price ?? 0;
  });

  protected readonly total = computed(() => this.subtotal() + this.shipping());

  protected readonly isShippingRequired = computed(() => {
    const options = this.shippingOptions();
    const selectedId = this.selectedShippingOptionId();
    const selectedMethod = options.find((option) => option.id === selectedId);
    return (selectedMethod?.price ?? 0) > 0;
  });

  protected readonly isStep1Valid = computed(() => {
    const name = this.customerName().trim();
    const phone = this.customerPhone().trim();
    const email = this.customerEmail().trim();
    const document = this.billingDocument().trim();
    const documentType = this.billingDocumentType();
    const city = this.billingCity().trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return !!name && !!phone && !!email && emailValid && !!document && !!documentType && !!city;
  });

  protected readonly isStep2Valid = computed(() => {
    return this.selectedShippingOptionId() !== '' && this.selectedShippingOptionId() !== null;
  });

  protected readonly isStep3Valid = computed(() => {
    const needsShipping = this.isShippingRequired();
    const receiver = this.receiverName().trim();
    const receiverPhone = this.receiverPhone().trim();
    const deliveryDate = this.deliveryDate();
    const address = this.deliveryAddress().trim();
    if (needsShipping && (!receiver || !receiverPhone || !deliveryDate || !address)) {
      return false;
    }
    if (this.includesCard()) {
      return this.cardMessage().trim().length > 0;
    }
    return true;
  });

  protected readonly isCheckoutValid = computed(() => {
    return !this.isEmpty() && this.isStep1Valid() && this.isStep2Valid() && this.isStep3Valid();
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

  protected goToStep(step: number): void {
    if (step < 1 || step > 3) return;
    if (step === 2 && !this.isStep1Valid()) {
      this.checkoutError.set('Completa todos los campos obligatorios del paso 1.');
      return;
    }
    if (step === 3 && (!this.isStep1Valid() || !this.isStep2Valid())) {
      this.checkoutError.set('Completa los pasos anteriores antes de continuar.');
      return;
    }
    this.checkoutError.set(null);
    this.currentStep.set(step);
    this.saveCheckoutForm();
  }

  protected nextStep(): void {
    this.goToStep(this.currentStep() + 1);
  }

  protected prevStep(): void {
    this.goToStep(this.currentStep() - 1);
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
      billingDocument: this.billingDocument().trim(),
      billingDocumentType: this.billingDocumentType() || undefined,
      billingCity: this.billingCity().trim(),
      billingAddress: this.billingAddress().trim() || undefined,
      deliveryAddress: this.deliveryAddress().trim(),
      cardMessage: this.includesCard() ? (this.cardMessage().trim() || undefined) : undefined,
      shippingMethodId: this.selectedShippingOptionId() || null,
      receiverName: this.receiverName().trim(),
      receiverPhone: this.receiverPhone().trim(),
      cardSignature: this.cardSignature().trim() || undefined,
      deliveryDate: this.deliveryDate(),
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
    const data: CheckoutFormData = {
      customerName: this.customerName(),
      customerPhone: this.customerPhone(),
      customerEmail: this.customerEmail(),
      billingDocument: this.billingDocument(),
      billingDocumentType: this.billingDocumentType(),
      billingCity: this.billingCity(),
      billingAddress: this.billingAddress(),
      deliveryAddress: this.deliveryAddress(),
      shippingOptionId: this.selectedShippingOptionId(),
      includesCard: this.includesCard(),
      cardMessage: this.cardMessage(),
      receiverName: this.receiverName(),
      receiverPhone: this.receiverPhone(),
      cardSignature: this.cardSignature(),
      deliveryDate: this.deliveryDate(),
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
      const data: CheckoutFormData = JSON.parse(raw);
      if (typeof data.customerName === 'string') this.customerName.set(data.customerName);
      if (typeof data.customerPhone === 'string') this.customerPhone.set(data.customerPhone);
      if (typeof data.customerEmail === 'string') this.customerEmail.set(data.customerEmail);
      if (typeof data.billingDocument === 'string') this.billingDocument.set(data.billingDocument);
      if (typeof data.billingDocumentType === 'string' && data.billingDocumentType) {
        this.billingDocumentType.set(data.billingDocumentType as BillingDocumentType);
      }
      if (typeof data.billingCity === 'string') this.billingCity.set(data.billingCity);
      if (typeof data.billingAddress === 'string') this.billingAddress.set(data.billingAddress);
      if (typeof data.deliveryAddress === 'string') this.deliveryAddress.set(data.deliveryAddress);
      if (typeof data.shippingOptionId === 'number' || data.shippingOptionId === '') {
        this.selectedShippingOptionId.set(data.shippingOptionId);
      }
      if (typeof data.includesCard === 'boolean') this.includesCard.set(data.includesCard);
      if (typeof data.cardMessage === 'string') this.cardMessage.set(data.cardMessage);
      if (typeof data.receiverName === 'string') this.receiverName.set(data.receiverName);
      if (typeof data.receiverPhone === 'string') this.receiverPhone.set(data.receiverPhone);
      if (typeof data.cardSignature === 'string') this.cardSignature.set(data.cardSignature);
      if (typeof data.deliveryDate === 'string') this.deliveryDate.set(data.deliveryDate);
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
