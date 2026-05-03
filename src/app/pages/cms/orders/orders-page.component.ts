import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Order, PaginatedResponse, Product, ShippingMethod, User } from '../../../core/models';
import { OrdersApiService } from '../../../core/services/orders-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ShippingMethodsApiService } from '../../../core/services/shipping-methods-api.service';
import { UsersApiService } from '../../../core/services/users-api.service';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './orders-page.component.html',
})
export class OrdersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly shippingMethodsApi = inject(ShippingMethodsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.nonNullable.group({
    userId: 0,
    customerName: this.fb.nonNullable.control('', Validators.required),
    customerEmail: this.fb.nonNullable.control('', Validators.email),
    customerPhone: '',
    shippingAddress: '',
    includesCard: false,
    cardMessage: '',
    status: 'pending',
    shippingMethodId: '',
    includeShippingPrice: true,
    shippingPrice: '',
    items: this.fb.array<FormGroup>([]),
  });

  protected response: PaginatedResponse<Order> | null = null;
  protected users: User[] = [];
  protected products: Product[] = [];
  protected shippingMethods: ShippingMethod[] = [];
  protected editingOrderId: number | null = null;
  protected editingOrderCode: string | null = null;
  protected editingOrder: Order | null = null;
  protected isFormModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly orderStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  protected get isPaidWithMercadoPago(): boolean {
    return this.editingOrder?.paymentProvider === 'mercadopago';
  }

  protected copyReference(): void {
    const ref = this.editingOrder?.paymentReference;
    if (ref) {
      navigator.clipboard.writeText(ref);
    }
  }

  ngOnInit(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders(1));

    this.form.controls.shippingMethodId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((shippingMethodId) => this.syncShippingPriceWithMethod(shippingMethodId));

    this.form.controls.userId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((userId) => this.prefillCustomerFromUser(userId));

    this.addItem();
    this.loadReferenceData();
    this.loadOrders();
  }

  protected get items(): FormArray<FormGroup> {
    return this.form.controls.items;
  }

  protected loadReferenceData(): void {
    forkJoin({
      users: this.usersApi.list({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' }),
      products: this.productsApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
      shippingMethods: this.shippingMethodsApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
    }).subscribe({
      next: ({ users, products, shippingMethods }) => {
        this.users = users.items;
        this.products = products.items;
        this.shippingMethods = shippingMethods.items;
        this.prefillCustomerFromUser(this.form.controls.userId.value);
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected loadOrders(page = this.response?.pagination.page ?? 1): void {
    this.ordersApi.list({
      page,
      pageSize: this.listForm.getRawValue().pageSize,
      status: this.listForm.getRawValue().status,
      sortBy: this.listForm.getRawValue().sortBy,
      sortOrder: this.listForm.getRawValue().sortOrder,
    }).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected addItem(item?: { productId: number; quantity: number }): void {
    this.items.push(this.fb.nonNullable.group({
      productId: item?.productId ?? 0,
      quantity: item?.quantity ?? 1,
    }));
  }

  protected removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }

    this.items.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: Record<string, unknown> = this.isPaidWithMercadoPago
      ? {
          status: rawValue.status,
          includesCard: rawValue.includesCard,
          cardMessage: rawValue.includesCard ? (rawValue.cardMessage.trim() || undefined) : undefined,
        }
      : {
          userId: Number(rawValue.userId),
          customerName: rawValue.customerName.trim(),
          customerEmail: rawValue.customerEmail.trim() || undefined,
          customerPhone: rawValue.customerPhone.trim() || undefined,
          shippingAddress: rawValue.shippingAddress.trim() || undefined,
          includesCard: rawValue.includesCard,
          cardMessage: rawValue.includesCard ? (rawValue.cardMessage.trim() || undefined) : undefined,
          status: rawValue.status,
          shippingMethodId: rawValue.shippingMethodId ? Number(rawValue.shippingMethodId) : null,
          includeShippingPrice: rawValue.includeShippingPrice,
          shippingPrice: rawValue.shippingPrice === '' ? undefined : Number(rawValue.shippingPrice),
          items: (rawValue.items as Array<{ productId: number; quantity: number }>)
            .filter((item) => Number(item.productId) > 0 && Number(item.quantity) > 0)
            .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) })),
        };

    const request$ = this.editingOrderId
      ? this.ordersApi.update(this.editingOrderId, payload)
      : this.ordersApi.create(payload);

    request$.subscribe({
      next: (order: Order) => {
        this.successMessage = this.editingOrderId
          ? `Orden ${order.code} actualizada.`
          : `Orden ${order.code} creada.`;
        this.errorMessage = '';
        this.resetForm();
        this.loadOrders();
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected editOrder(order: Order): void {
    this.editingOrder = order;
    this.editingOrderId = order.id;
    this.editingOrderCode = order.code;
    this.isFormModalOpen = true;
    this.items.clear();
    order.items.forEach((item) => this.addItem({ productId: item.productId, quantity: item.quantity }));
    this.form.reset({
      userId: order.userId,
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      shippingAddress: order.shippingAddress ?? '',
      includesCard: order.includesCard,
      cardMessage: order.cardMessage ?? '',
      status: order.status,
      shippingMethodId: order.shipping?.shippingMethodId ? String(order.shipping.shippingMethodId) : '',
      includeShippingPrice: order.shipping?.includesPrice ?? false,
      shippingPrice: order.shipping ? String(order.shipping.price) : '',
      items: this.items.getRawValue(),
    }, { emitEvent: false });

    if (this.isPaidWithMercadoPago) {
      this.items.disable({ emitEvent: false });
      (
        ['userId', 'customerName', 'customerEmail', 'customerPhone',
         'shippingAddress', 'shippingMethodId', 'includeShippingPrice', 'shippingPrice'] as const
      ).forEach((field) => this.form.controls[field].disable({ emitEvent: false }));
    }
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
  }

  protected deleteOrder(order: Order): void {
    if (!confirm(`¿Eliminar la orden ${order.code}?`)) {
      return;
    }

    this.ordersApi.remove(order.id).subscribe({
      next: () => {
        this.successMessage = 'Orden eliminada.';
        this.loadOrders(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.errorMessage = extractErrorMessage(error);
      },
    });
  }

  protected resetForm(): void {
    this.form.enable({ emitEvent: false });
    this.editingOrder = null;
    this.editingOrderId = null;
    this.editingOrderCode = null;
    this.isFormModalOpen = false;
    this.items.clear();
    this.addItem();
    this.form.reset({
      userId: 0,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      shippingAddress: '',
      includesCard: false,
      cardMessage: '',
      status: 'pending',
      shippingMethodId: '',
      includeShippingPrice: true,
      shippingPrice: '',
      items: this.items.getRawValue(),
    }, { emitEvent: false });
  }

  protected changePage(direction: number): void {
    if (!this.response) {
      return;
    }

    const nextPage = this.response.pagination.page + direction;
    if (nextPage < 1 || nextPage > this.response.pagination.totalPages) {
      return;
    }

    this.loadOrders(nextPage);
  }

  protected findProduct(productId: number): Product | undefined {
    return this.products.find((product) => product.id === Number(productId));
  }

  protected orderPreview(): { subtotal: number; taxTotal: number; shipping: number; total: number } {
    return this.calculatePreview();
  }

  protected shippingPricePlaceholder(): string {
    const shippingMethodId = Number(this.form.controls.shippingMethodId.value);
    const shippingMethod = this.shippingMethods.find((method) => method.id === shippingMethodId);

    return shippingMethod?.price !== null && shippingMethod?.price !== undefined
      ? String(shippingMethod.price)
      : '0';
  }

  private calculatePreview(): { subtotal: number; taxTotal: number; shipping: number; total: number } {
    const rawValue = this.form.getRawValue();
    const items = rawValue.items as Array<{ productId: number; quantity: number }>;
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const product = this.findProduct(Number(item.productId));
      const quantity = Number(item.quantity);

      if (!product || !quantity) {
        continue;
      }

      const lineSubtotal = product.price * quantity;
      const lineTax = product.hasVat ? lineSubtotal * (product.vatRate / 100) : 0;
      subtotal += lineSubtotal;
      taxTotal += lineTax;
    }

    const shipping = rawValue.includeShippingPrice
      ? Number(rawValue.shippingPrice || this.shippingMethods.find((method) => method.id === Number(rawValue.shippingMethodId))?.price || 0)
      : 0;

    return {
      subtotal,
      taxTotal,
      shipping,
      total: subtotal + taxTotal + shipping,
    };
  }

  private syncShippingPriceWithMethod(shippingMethodId: string): void {
    if (!shippingMethodId) {
      this.form.controls.shippingPrice.setValue('', { emitEvent: false });
      this.form.controls.includeShippingPrice.setValue(false, { emitEvent: false });
      return;
    }

    const shippingMethod = this.shippingMethods.find((method) => method.id === Number(shippingMethodId));

    if (!shippingMethod) {
      return;
    }

    this.form.controls.shippingPrice.setValue(
      shippingMethod.price === null ? '' : String(shippingMethod.price),
      { emitEvent: false }
    );
  }

  private prefillCustomerFromUser(userId: number): void {
    const user = this.users.find((entry) => entry.id === Number(userId));

    if (!user) {
      return;
    }

    if (!this.form.controls.customerName.value.trim()) {
      this.form.controls.customerName.setValue(`${user.firstName} ${user.lastName}`.trim(), { emitEvent: false });
    }

    if (!this.form.controls.customerEmail.value.trim()) {
      this.form.controls.customerEmail.setValue(user.email, { emitEvent: false });
    }
  }
}
