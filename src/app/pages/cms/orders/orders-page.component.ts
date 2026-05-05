import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

import { extractErrorMessage } from '../../../core/api.utils';
import { Order, PaginatedResponse, Product, ShippingMethod } from '../../../core/models';
import { OrdersApiService } from '../../../core/services/orders-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ShippingMethodsApiService } from '../../../core/services/shipping-methods-api.service';
import { SwalService } from '../../../core/services/swal.service';

function itemValidator(control: FormGroup): { [key: string]: boolean } | null {
  const productId = Number(control.get('productId')?.value);
  const quantity = Number(control.get('quantity')?.value);
  if (!productId || productId <= 0) {
    return { productRequired: true };
  }
  if (!quantity || quantity <= 0) {
    return { quantityRequired: true };
  }
  return null;
}

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './orders-page.component.html',
})
export class OrdersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly shippingMethodsApi = inject(ShippingMethodsApiService);
  private readonly swal = inject(SwalService);
  private readonly destroyRef = inject(DestroyRef);

  protected filtersExpanded = signal(false);
  protected activeTab = signal<'cliente' | 'envio' | 'items'>('cliente');
  protected exporting = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    status: '',
    isPaid: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    pageSize: 10,
  });

  protected readonly form = this.fb.nonNullable.group({
    customerName: this.fb.nonNullable.control('', [Validators.required]),
    customerEmail: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    customerPhone: this.fb.nonNullable.control('', [Validators.required]),
    billingDocument: this.fb.nonNullable.control('', [Validators.required]),
    billingDocumentType: this.fb.nonNullable.control('', [Validators.required]),
    orderDate: this.fb.nonNullable.control(this.todayString()),
    billingCity: this.fb.nonNullable.control('', [Validators.required]),
    billingAddress: '',
    shippingAddress: '',
    includesCard: false,
    cardMessage: '',
    cardSignature: '',
    receiverName: '',
    receiverPhone: '',
    deliveryDate: '',
    status: 'pending',
    isPaid: false,
    paymentProvider: '',
    shippingMethodId: '',
    includeShippingPrice: true,
    shippingPrice: '',
    items: this.fb.array<FormGroup>([]),
  });

  protected response: PaginatedResponse<Order> | null = null;
  protected products: Product[] = [];
  protected shippingMethods: ShippingMethod[] = [];
  protected editingOrderId: number | null = null;
  protected editingOrderCode: string | null = null;
  protected editingOrder: Order | null = null;
  protected isFormModalOpen = false;

  protected readonly orderStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  protected readonly billingDocumentTypes = ['CC', 'CE', 'NIT', 'PASAPORTE'];
  protected readonly cmsPaymentProviders = ['tienda', 'whatsapp', 'otros'];

  private readonly statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };

  private readonly channelLabels: Record<string, string> = {
    tienda: 'Tienda',
    whatsapp: 'WhatsApp',
    otros: 'Otros',
    mercadopago: 'MercadoPago',
  };

  protected todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  protected statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  protected channelLabel(value: string | null): string {
    return value ? (this.channelLabels[value] ?? value) : '';
  }

  protected availableStatuses(): string[] {
    if (!this.editingOrder) return this.orderStatuses;
    switch (this.editingOrder.status) {
      case 'pending':   return ['pending', 'confirmed', 'cancelled'];
      case 'confirmed': return ['confirmed', 'completed', 'cancelled'];
      case 'completed': return ['completed'];
      case 'cancelled': return ['cancelled'];
      default:          return this.orderStatuses;
    }
  }

  protected get isPaidWithMercadoPago(): boolean {
    return this.editingOrder?.paymentProvider === 'mercadopago';
  }

  protected get isCompletedOrder(): boolean {
    return this.editingOrder?.status === 'completed';
  }

  protected get completedOrderCanEditShipping(): boolean {
    return this.isCompletedOrder && (this.editingOrder?.shipping?.price ?? 0) > 0;
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

    this.addItem();
    this.loadReferenceData();
    this.loadOrders();
  }

  protected get items(): FormArray<FormGroup> {
    return this.form.controls.items;
  }

  protected loadReferenceData(): void {
    forkJoin({
      products: this.productsApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
      shippingMethods: this.shippingMethodsApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
    }).subscribe({
      next: ({ products, shippingMethods }) => {
        this.products = products.items;
        this.shippingMethods = shippingMethods.items;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected loadOrders(page = this.response?.pagination.page ?? 1): void {
    const { status, isPaid, sortBy, sortOrder, pageSize } = this.listForm.getRawValue();
    this.ordersApi.list({
      page,
      pageSize,
      status,
      isPaid: isPaid || undefined,
      sortBy,
      sortOrder,
    }).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
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

  protected hasDuplicateItems(): boolean {
    const productIds = this.items.controls
      .map((ctrl) => Number(ctrl.get('productId')?.value))
      .filter((id) => id > 0);
    return productIds.length !== new Set(productIds).size;
  }

  protected isShippingRequired(): boolean {
    const shippingMethodId = Number(this.form.controls.shippingMethodId.value);
    if (!shippingMethodId) return false;
    const priceValue = this.form.controls.shippingPrice.value;
    const price = priceValue !== ''
      ? Number(priceValue)
      : (this.shippingMethods.find((m) => m.id === shippingMethodId)?.price ?? 0);
    return price > 0;
  }

  protected findInvalidTab(): 'cliente' | 'envio' | 'items' | null {
    const clientFields = ['customerName', 'customerEmail', 'customerPhone', 'billingDocument', 'billingDocumentType', 'billingCity'];
    const needsShipping = this.isShippingRequired();
    const shippingFields = needsShipping
      ? ['shippingAddress', 'receiverName', 'receiverPhone']
      : ['shippingAddress'];

    const hasClientErrors = clientFields.some((f) => this.form.get(f)?.invalid);
    const hasShippingErrors = shippingFields.some((f) => {
      const ctrl = this.form.get(f);
      return ctrl?.invalid || (needsShipping && !ctrl?.value?.trim());
    });
    const hasItemErrors = this.items.length === 0 || this.items.controls.some((ctrl) => {
      const pid = Number(ctrl.get('productId')?.value);
      const qty = Number(ctrl.get('quantity')?.value);
      return !pid || pid <= 0 || !qty || qty <= 0;
    });

    if (hasClientErrors) return 'cliente';
    if (hasShippingErrors) return 'envio';
    if (hasItemErrors || this.hasDuplicateItems()) return 'items';
    return null;
  }

  protected submit(): void {
    if (this.isCompletedOrder) {
      if (!this.completedOrderCanEditShipping) return;
      const rawValue = this.form.getRawValue();
      this.ordersApi.update(this.editingOrderId!, {
        receiverName: rawValue.receiverName.trim() || undefined,
        receiverPhone: rawValue.receiverPhone.trim() || undefined,
        shippingAddress: rawValue.shippingAddress.trim() || undefined,
      }).subscribe({
        next: (order: Order) => {
          this.swal.success(`Orden ${order.code} actualizada.`);
          this.resetForm();
          this.loadOrders();
        },
        error: (error) => this.swal.error(extractErrorMessage(error)),
      });
      return;
    }

    this.form.markAllAsTouched();

    if (this.hasDuplicateItems()) {
      this.activeTab.set('items');
      this.swal.error('No puedes agregar el mismo producto más de una vez.');
      return;
    }

    const invalidTab = this.findInvalidTab();
    if (invalidTab) {
      this.activeTab.set(invalidTab);
      this.swal.error('Completa todos los campos obligatorios antes de continuar.');
      return;
    }

    const rawValue = this.form.getRawValue();

    if (this.editingOrderId && rawValue.status === 'completed' && !rawValue.isPaid) {
      this.activeTab.set('cliente');
      this.swal.error('Una orden no pagada no puede marcarse como completada.');
      return;
    }

    const validItems = (rawValue.items as Array<{ productId: number; quantity: number }>)
      .filter((item) => Number(item.productId) > 0 && Number(item.quantity) > 0)
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }));

    if (!validItems.length) {
      this.activeTab.set('items');
      this.swal.error('Debes agregar al menos un producto a la orden.');
      return;
    }

    for (const item of validItems) {
      const product = this.findProduct(item.productId);
      if (product && product.stock < item.quantity) {
        this.activeTab.set('items');
        this.swal.error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
        return;
      }
    }

    const customerFields = {
      userId: null,
      orderDate: rawValue.orderDate || undefined,
      paymentProvider: rawValue.paymentProvider || undefined,
      customerName: rawValue.customerName.trim(),
      customerEmail: rawValue.customerEmail.trim() || undefined,
      customerPhone: rawValue.customerPhone.trim() || undefined,
      billingDocument: rawValue.billingDocument.trim() || undefined,
      billingDocumentType: rawValue.billingDocumentType || undefined,
      billingCity: rawValue.billingCity.trim() || undefined,
      billingAddress: rawValue.billingAddress.trim() || undefined,
      shippingAddress: rawValue.shippingAddress.trim() || undefined,
      includesCard: rawValue.includesCard,
      cardMessage: rawValue.includesCard ? (rawValue.cardMessage.trim() || undefined) : undefined,
      cardSignature: rawValue.includesCard ? (rawValue.cardSignature.trim() || undefined) : undefined,
      receiverName: rawValue.receiverName.trim() || undefined,
      receiverPhone: rawValue.receiverPhone.trim() || undefined,
      deliveryDate: rawValue.deliveryDate || undefined,
      shippingMethodId: rawValue.shippingMethodId ? Number(rawValue.shippingMethodId) : null,
      includeShippingPrice: rawValue.includeShippingPrice,
      shippingPrice: rawValue.shippingPrice === '' ? undefined : Number(rawValue.shippingPrice),
      items: validItems,
    };

    let payload: Record<string, unknown>;

    if (this.isPaidWithMercadoPago) {
      payload = {
        status: rawValue.status,
        isPaid: rawValue.isPaid,
        includesCard: rawValue.includesCard,
        cardMessage: rawValue.includesCard ? (rawValue.cardMessage.trim() || undefined) : undefined,
        cardSignature: rawValue.includesCard ? (rawValue.cardSignature.trim() || undefined) : undefined,
      };
    } else if (this.editingOrderId) {
      payload = { ...customerFields, status: rawValue.status, isPaid: rawValue.isPaid };
    } else {
      payload = customerFields;
    }

    const request$ = this.editingOrderId
      ? this.ordersApi.update(this.editingOrderId, payload)
      : this.ordersApi.create(payload);

    request$.subscribe({
      next: (order: Order) => {
        this.swal.success(this.editingOrderId
          ? `Orden ${order.code} actualizada.`
          : `Orden ${order.code} creada.`);
        this.resetForm();
        this.loadOrders();
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected editOrder(order: Order): void {
    this.editingOrder = order;
    this.editingOrderId = order.id;
    this.editingOrderCode = order.code;
    this.isFormModalOpen = true;
    this.activeTab.set('cliente');
    this.items.clear();
    order.items.forEach((item) => this.addItem({ productId: item.productId, quantity: item.quantity }));
    this.form.reset({
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      billingDocument: order.billingDocument ?? '',
      billingDocumentType: order.billingDocumentType ?? '',
      billingCity: order.billingCity ?? '',
      billingAddress: order.billingAddress ?? '',
      shippingAddress: order.shippingAddress ?? '',
      includesCard: order.includesCard,
      cardMessage: order.cardMessage ?? '',
      cardSignature: order.cardSignature ?? '',
      receiverName: order.receiverName ?? '',
      receiverPhone: order.receiverPhone ?? '',
      deliveryDate: order.deliveryDate ?? '',
      status: order.status,
      isPaid: order.isPaid,
      paymentProvider: order.paymentProvider ?? '',
      shippingMethodId: order.shipping?.shippingMethodId ? String(order.shipping.shippingMethodId) : '',
      includeShippingPrice: order.shipping?.includesPrice ?? false,
      shippingPrice: order.shipping ? String(order.shipping.price) : '',
      items: this.items.getRawValue(),
    }, { emitEvent: false });

    if (this.isCompletedOrder) {
      this.form.disable({ emitEvent: false });
      if (this.completedOrderCanEditShipping) {
        (['receiverName', 'receiverPhone', 'shippingAddress'] as const)
          .forEach((field) => this.form.controls[field].enable({ emitEvent: false }));
      }
    } else if (this.isPaidWithMercadoPago) {
      this.items.disable({ emitEvent: false });
      (
        ['customerName', 'customerEmail', 'customerPhone',
         'billingDocument', 'billingCity', 'billingAddress', 'shippingAddress', 'shippingMethodId',
         'includeShippingPrice', 'shippingPrice', 'receiverName', 'receiverPhone',
         'deliveryDate', 'paymentProvider', 'isPaid'] as const
      ).forEach((field) => this.form.controls[field].disable({ emitEvent: false }));
    }
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.isFormModalOpen = true;
    this.activeTab.set('cliente');
  }

  protected async toggleOrderActive(order: Order): Promise<void> {
    const action = order.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.swal.confirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} la orden "${order.code}"?`,
      '¿Estás seguro?',
      'Sí, confirmar',
      'Cancelar'
    );
    if (!confirmed) {
      return;
    }

    this.ordersApi.toggleActive(order.id).subscribe({
      next: () => {
        this.swal.success(`Orden "${order.code}" ${order.isActive ? 'desactivada' : 'activada'}.`);
        this.loadOrders(this.response?.pagination.page ?? 1);
      },
      error: (error) => {
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  protected resetForm(): void {
    this.form.enable({ emitEvent: false });
    this.editingOrder = null;
    this.editingOrderId = null;
    this.editingOrderCode = null;
    this.isFormModalOpen = false;
    this.activeTab.set('cliente');
    this.items.clear();
    this.addItem();
    this.form.reset({
      orderDate: this.todayString(),
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      billingDocument: '',
      billingDocumentType: '',
      billingCity: '',
      billingAddress: '',
      shippingAddress: '',
      includesCard: false,
      cardMessage: '',
      cardSignature: '',
      receiverName: '',
      receiverPhone: '',
      deliveryDate: '',
      status: 'pending',
      isPaid: false,
      paymentProvider: '',
      shippingMethodId: '',
      includeShippingPrice: true,
      shippingPrice: '',
      items: this.items.getRawValue(),
    }, { emitEvent: false });
  }

  protected exportExcel(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const { status, isPaid, sortBy, sortOrder } = this.listForm.getRawValue();
    this.ordersApi.export({ status, isPaid: isPaid || undefined, sortBy, sortOrder }).subscribe({
      next: (orders) => {
        this.exporting.set(false);
        this.downloadCsv(orders);
      },
      error: (error) => {
        this.exporting.set(false);
        this.swal.error(extractErrorMessage(error));
      },
    });
  }

  private downloadCsv(orders: Order[]): void {
    const headers = [
      'Código', 'Fecha creación', 'Fecha envío', 'Estado', 'Pagado',
      'Nombre cliente', 'Email cliente', 'Teléfono cliente',
      'Tipo documento', 'Documento', 'Ciudad',
      'Método de envío', 'Dirección de envío',
      'Nombre receptor', 'Teléfono receptor',
      'Tiene tarjeta', 'Mensaje tarjeta', 'Firma tarjeta',
      'Precio envío', 'Suma envío al total',
      'Subtotal', 'IVA', 'Total',
      'Proveedor de pago', 'Referencia de pago',
      'Registrado por', 'Productos',
    ];

    const rows = orders.map((o) => [
      o.code,
      o.createdAt,
      o.deliveryDate ?? '',
      this.statusLabel(o.status),
      o.isPaid ? 'Sí' : 'No',
      o.customerName ?? '',
      o.customerEmail ?? '',
      o.customerPhone ?? '',
      o.billingDocumentType ?? '',
      o.billingDocument ?? '',
      o.billingCity ?? '',
      o.shipping?.name ?? '',
      o.shippingAddress ?? '',
      o.receiverName ?? '',
      o.receiverPhone ?? '',
      o.includesCard ? 'Sí' : 'No',
      o.cardMessage ?? '',
      o.cardSignature ?? '',
      o.shipping?.price ?? 0,
      o.shipping?.includesPrice ? 'Sí' : 'No',
      o.subtotal,
      o.taxTotal,
      o.total,
      o.paymentProvider ?? '',
      o.paymentReference ?? '',
      o.user ? `${o.user.firstName} ${o.user.lastName}` : '',
      o.items.map((i) => `${i.productName} x${i.quantity}`).join(' | '),
    ]);

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordenes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  protected availableProducts(index: number): Product[] {
    const takenIds = new Set(
      this.items.controls
        .filter((_, i) => i !== index)
        .map((ctrl) => Number(ctrl.get('productId')?.value))
        .filter((id) => id > 0)
    );
    return this.products.filter((p) => !takenIds.has(p.id));
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

}
