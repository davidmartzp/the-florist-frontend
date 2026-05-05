import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { SiteCategoriesApiService } from '../../../core/services/site-categories-api.service';
import { SiteProductsApiService } from '../../../core/services/site-products-api.service';
import {
  SiteCategory,
  SiteProduct,
  formatPrice,
  siteCommitments,
} from '../site-content';
import { Product } from '../../../core/models';
import { BannerCarouselComponent, BannerSlide } from './banner-carousel/banner-carousel.component';
import { HeroSectionComponent, HeroStat } from './hero-section/hero-section.component';
import {
  FeaturedProductsSectionComponent,
  FeaturedProduct,
  CategoryFilter as FeaturedCategoryFilter,
} from './featured-products-section/featured-products-section.component';
import { StorySectionComponent } from './story-section/story-section.component';

interface CategoryFilter {
  id: number | 'all';
  label: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    BannerCarouselComponent,
    // HeroSectionComponent, // oculto temporalmente
    FeaturedProductsSectionComponent,
    StorySectionComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly siteCategoriesApi = inject(SiteCategoriesApiService);
  private readonly siteProductsApi = inject(SiteProductsApiService);
  private readonly selectedCategoryId = signal<number | 'all'>('all');
  private readonly isFilterTransitioning = signal(false);
  private filterTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly categoriesState = signal<SiteCategory[]>([]);
  private readonly productsState = signal<SiteProduct[]>([]);
  private readonly isLoadingProductsState = signal(false);

  protected readonly categories = this.categoriesState.asReadonly();
  protected readonly products = this.productsState.asReadonly();
  protected readonly productFilters = computed<CategoryFilter[]>(() => [
    { id: 'all', label: 'Todos' },
    ...this.categories().map((category) => ({ id: category.id ?? 0, label: category.name })),
  ]);
  protected readonly selectedCategoryFilterId = this.selectedCategoryId.asReadonly();

  protected readonly heroImage =
    'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1400&q=80';
  protected readonly commitments = siteCommitments;
  protected readonly formatPrice = formatPrice;
  protected readonly filteredProducts = computed(() => {
    const selectedCategoryId = this.selectedCategoryId();

    return this.products().filter((product) => {
      if (this.isComplementProduct(product)) {
        return false;
      }

      if (selectedCategoryId === 'all') {
        return true;
      }

      return product.categoryIds?.includes(selectedCategoryId);
    });
  });
  protected readonly isProductFilterTransitioning = this.isFilterTransitioning.asReadonly();
  protected readonly isLoadingProducts = this.isLoadingProductsState.asReadonly();

  protected readonly stats: HeroStat[] = [
    { value: '40+', label: 'años de tradición familiar' },
    { value: '100%', label: 'Directo desde el cultivo a la entrega' },
    { value: '100%', label: 'curaduría floral propia' },
  ];

  protected readonly bannerSlides: BannerSlide[] = [
    {
      image: 'https://lafloreriabyflorescolon.co/banners/banner_1.png',
      mobileImage: 'https://lafloreriabyflorescolon.co/banners/banner_1.png',
      alt: 'Banner 1 Día de la Madre - La Florería by Flores Colón',
    },
    {
      image: 'https://lafloreriabyflorescolon.co/banners/banner_2.jpg',
      mobileImage: 'https://lafloreriabyflorescolon.co/banners/banner_2_mobile.jpg',
      alt: 'Banner 2 Día de la Madre - La Florería by Flores Colón',
    },
    {
      image: 'https://lafloreriabyflorescolon.co/banners/banner_3.jpg',
      mobileImage: 'https://lafloreriabyflorescolon.co/banners/banner_3_mobile.jpg',
      alt: 'Banner 3 Día de la Madre - La Florería by Flores Colón',
    },
    {
      image: 'https://lafloreriabyflorescolon.co/banners/banner_4.jpg',
      mobileImage: 'https://lafloreriabyflorescolon.co/banners/banner_4_mobile.jpg',
      alt: 'Banner 4 Día de la Madre - La Florería by Flores Colón',
    },
  ];

  protected readonly occasions: string[] = [];

  public constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.filterTransitionTimeout) {
        clearTimeout(this.filterTransitionTimeout);
      }
    });

    this.loadCategories();
    this.loadProducts();
  }

  protected get featuredProducts(): FeaturedProduct[] {
    return this.filteredProducts().map((product) => ({
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      badge: product.badge,
    }));
  }

  protected get featuredFilters(): FeaturedCategoryFilter[] {
    return this.productFilters().map((filter) => ({
      id: filter.id,
      label: filter.label,
    }));
  }

  protected onCategoryFilterChange(categoryId: number | 'all'): void {
    if (this.selectedCategoryId() === categoryId) {
      return;
    }

    if (this.filterTransitionTimeout) {
      clearTimeout(this.filterTransitionTimeout);
    }

    this.isFilterTransitioning.set(true);
    this.selectedCategoryId.set(categoryId);

    this.filterTransitionTimeout = setTimeout(() => {
      this.isFilterTransitioning.set(false);
      this.filterTransitionTimeout = null;
    }, 280);
  }

  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default.png';
  }

  private loadCategories(): void {
    this.siteCategoriesApi.list().subscribe({
      next: (categories) => {
        if (categories.length) {
          const mappedCategories = categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            name: category.name,
            description: category.description,
          }));

          this.categoriesState.set(mappedCategories);
        }
      },
      error: () => {
        // Keep the existing fallback categories when the API is unavailable.
      },
    });
  }

  private loadProducts(): void {
    this.isLoadingProductsState.set(true);

    const query: Record<string, unknown> = { page: 1, pageSize: 100, type: 'GENERAL' };

    this.siteProductsApi.list(query).subscribe({
      next: (response) => {
        const mappedProducts = response.items
          .filter((product: Product) => !this.isComplementProduct(product))
          .map((product) => ({
            slug: this.slugify(product.name),
            type: product.type || 'GENERAL',
            name: product.name,
            category: product.categories?.[0]?.name || 'Sin categoría',
            categorySlug: product.categories?.[0]?.slug || 'sin-categoria',
            categoryIds: product.categories?.map((category) => category.id) ?? [],
            price: product.price,
            badge: '',
            stemCount: '',
            deliveryNote: '',
            description: product.description || '',
            image: product.image || '/assets/default.png',
            highlights: [],
          }));

        this.productsState.set(mappedProducts);
        this.isLoadingProductsState.set(false);
      },
      error: () => {
        this.productsState.set([]);
        this.isLoadingProductsState.set(false);
      },
    });
  }

  private isComplementProduct(product: Product | SiteProduct): boolean {
    const type = String(product.type || 'GENERAL').toUpperCase();
    const categorySlug = 'categorySlug' in product ? String(product.categorySlug || '') : '';
    const categoryName = String((product as SiteProduct).category || '').toLowerCase();

    return (
      type === 'COMPLEMENT' ||
      type === 'COMPLEMENTO' ||
      categorySlug.toLowerCase().includes('complement') ||
      categoryName.includes('complement')
    );
  }

  private slugify(name: string): string {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
