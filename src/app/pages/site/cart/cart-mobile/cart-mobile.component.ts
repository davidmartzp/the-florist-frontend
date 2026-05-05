import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteCartApiService } from '../../../../core/services/site-cart-api.service';
import { SiteCartService } from '../../../../core/services/site-cart.service';
import { SiteProduct, formatPrice } from '../../site-content';
import { ComplementModalComponent, ComplementProduct } from './complement-modal/complement-modal.component';

@Component({
  selector: 'app-cart-mobile',
  standalone: true,
  imports: [CommonModule, RouterLink, ComplementModalComponent],
  templateUrl: './cart-mobile.component.html',
  styleUrl: './cart-mobile.component.scss',
})
export class CartMobileComponent {
  private readonly siteCartService = inject(SiteCartService);
  private readonly siteCartApi = inject(SiteCartApiService);
  private readonly complementsState = signal<SiteProduct[]>([]);

  protected readonly formatPrice = formatPrice;
  protected readonly items = this.siteCartService.items;
  protected readonly subtotal = this.siteCartService.subtotal;
  protected readonly total = this.siteCartService.total;
  protected readonly cartCount = this.siteCartService.cartCount;
  protected readonly isEmpty = this.siteCartService.isEmpty;
  protected readonly complements = this.complementsState.asReadonly();
  protected readonly hasGeneralItems = computed(() =>
    this.items().some((item) => item.type === 'GENERAL')
  );

  protected readonly selectedComplement = signal<ComplementProduct | null>(null);
  protected readonly isModalOpen = computed(() => this.selectedComplement() !== null);



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

  protected openComplementModal(complement: SiteProduct): void {
    this.selectedComplement.set({
      slug: complement.slug,
      name: complement.name,
      description: complement.description,
      price: complement.price,
      image: complement.image,
    });
  }

  protected closeComplementModal(): void {
    this.selectedComplement.set(null);
  }

  protected addComplement(complementSlug: string): void {
    const currentSlugs = this.items().map((item) => item.slug);
    this.siteCartApi.validateCartItem(complementSlug, currentSlugs).subscribe({
      next: (product) => {
        this.siteCartService.addProduct(complementSlug, 1, product);
        this.selectedComplement.set(null);
        this.refreshComplements();
      },
      error: () => {
        this.complementsState.set([]);
      },
    });
  }
}
