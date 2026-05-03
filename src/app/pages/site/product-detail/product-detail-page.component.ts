import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { SiteCartService } from '../../../core/services/site-cart.service';
import { formatPrice, SiteProduct } from '../site-content';
import { SiteProductsApiService } from '../../../core/services/site-products-api.service';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly siteCartService = inject(SiteCartService);
  private readonly siteProductsApi = inject(SiteProductsApiService);
  private readonly addedToCartState = signal(false);

  protected readonly formatPrice = formatPrice;
  protected readonly product = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('slug')),
      switchMap((slug) => this.siteProductsApi.findBySlug(slug ?? '')),
      map((apiProduct) => {
        if (!apiProduct) return null as SiteProduct | null;
        const categories = apiProduct.categories || [];
        return {
          id: apiProduct.id,
          slug: apiProduct.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          name: apiProduct.name,
          type: apiProduct.type || 'GENERAL',
          category: categories[0]?.name || 'Sin categoría',
          categorySlug: categories[0]?.slug || 'sin-categoria',
          categoryIds: categories.map((c) => c.id),
          categorySlugs: categories.map((c) => c.slug),
          price: apiProduct.price,
          badge: '',
          stemCount: '',
          deliveryNote: '',
          description: apiProduct.description || '',
          image: apiProduct.image || '/assets/default.png',
          highlights: [],
        } as SiteProduct;
      })
    ),
    { initialValue: null as SiteProduct | null }
  );

  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default.png';
  }

  protected readonly addedToCart = this.addedToCartState.asReadonly();

  protected addCurrentProductToCart(): void {
    const p: any = this.product();
    if (!p) return;
    this.siteCartService.addProduct(p.slug ?? p.name);
    this.addedToCartState.set(true);
  }
}
