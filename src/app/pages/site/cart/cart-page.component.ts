import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteCartApiService } from '../../../core/services/site-cart-api.service';
import { SiteCartService } from '../../../core/services/site-cart.service';
import { SiteProduct, formatPrice } from '../site-content';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent {
  private readonly siteCartService = inject(SiteCartService);
  private readonly siteCartApi = inject(SiteCartApiService);
  private readonly complementsState = signal<SiteProduct[]>([]);

  protected readonly formatPrice = formatPrice;
  protected readonly items = this.siteCartService.items;
  protected readonly subtotal = this.siteCartService.subtotal;
  protected readonly isEmpty = this.siteCartService.isEmpty;
  protected readonly complements = this.complementsState.asReadonly();
  protected readonly hasGeneralItems = computed(() =>
    this.items().some((item) => item.type === 'GENERAL')
  );

  public constructor() {
    effect(() => {
      if (!this.hasGeneralItems()) {
        this.complementsState.set([]);
        return;
      }

      this.refreshComplements();
    });
  }

  private refreshComplements(): void {
    if (!this.hasGeneralItems()) {
      this.complementsState.set([]);
      return;
    }

    this.siteCartApi.listComplements(true).subscribe({
      next: (items) => this.complementsState.set(items.slice(0, 5)),
      error: () => this.complementsState.set([]),
    });
  }

  protected decreaseQuantity(productSlug: string, currentQuantity: number): void {
    this.siteCartService.updateQuantity(productSlug, currentQuantity - 1);
    this.refreshComplements();
  }

  protected increaseQuantity(productSlug: string, currentQuantity: number): void {
    this.siteCartService.updateQuantity(productSlug, currentQuantity + 1);
    this.refreshComplements();
  }

  protected removeItem(productSlug: string): void {
    this.siteCartService.removeProduct(productSlug);
    this.refreshComplements();
  }

  protected addComplement(complementSlug: string): void {
    const currentSlugs = this.items().map((item) => item.slug);
    this.siteCartApi.validateCartItem(complementSlug, currentSlugs).subscribe({
      next: (product) => {
        this.siteCartService.addProduct(complementSlug, 1, product);
        this.refreshComplements();
      },
      error: () => {
        this.complementsState.set([]);
      },
    });
  }
}
