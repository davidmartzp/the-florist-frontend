import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SiteCartEntry, SiteProduct } from '../../pages/site/site-content';
import { SiteProductsApiService } from './site-products-api.service';

export interface SiteCartLineItem extends SiteProduct {
  quantity: number;
  lineTotal: number;
}

@Injectable({ providedIn: 'root' })
export class SiteCartService {
  private readonly storageKey = 'florist-site-cart';
  private readonly isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  private readonly productCacheState = signal<Record<string, SiteProduct>>({});
  private readonly cartEntriesState = signal<SiteCartEntry[]>(this.loadCartEntries());

  readonly cartEntries = computed(() => this.cartEntriesState());
  readonly items = computed<SiteCartLineItem[]>(() =>
    this.cartEntriesState()
      .map((entry) => {
        const product = this.productCacheState()[entry.productSlug];

        if (!product) {
          return null;
        }

        return {
          ...product,
          quantity: entry.quantity,
          lineTotal: product.price * entry.quantity,
        };
      })
      .filter((item): item is SiteCartLineItem => item !== null)
  );
  readonly cartCount = computed(() =>
    this.items().reduce((count, item) => count + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this.items().reduce((total, item) => total + item.lineTotal, 0)
  );
  readonly shipping = computed(() => (this.items().length > 0 ? 18000 : 0));
  readonly total = computed(() => this.subtotal() + this.shipping());
  readonly isEmpty = computed(() => this.items().length === 0);

  public constructor(private readonly siteProductsApi: SiteProductsApiService) {
    void this.refreshProductCacheForEntries(this.cartEntriesState());
  }

  addProduct(productSlug: string, quantity = 1, product?: SiteProduct): void {
    if (quantity < 1) {
      return;
    }

    if (product) {
      this.productCacheState.set({
        ...this.productCacheState(),
        [productSlug]: product,
      });
    }

    this.updateEntries((entries) => {
      const existingEntry = entries.find((entry) => entry.productSlug === productSlug);

      if (existingEntry) {
        return entries.map((entry) =>
          entry.productSlug === productSlug
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        );
      }

      return [...entries, { productSlug, quantity }];
    });
  }

  updateQuantity(productSlug: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(productSlug);
      return;
    }

    this.updateEntries((entries) =>
      entries.map((entry) =>
        entry.productSlug === productSlug ? { ...entry, quantity } : entry
      )
    );
  }

  removeProduct(productSlug: string): void {
    this.updateEntries((entries) =>
      entries.filter((entry) => entry.productSlug !== productSlug)
    );
  }

  clear(): void {
    this.persistEntries([]);
  }

  private updateEntries(
    updater: (entries: SiteCartEntry[]) => SiteCartEntry[]
  ): void {
    const updatedEntries = this.cleanupOrphanComplements(
      updater(this.cartEntriesState()),
      this.productCacheState()
    );
    this.persistEntries(updatedEntries);
    void this.refreshProductCacheForEntries(updatedEntries);
  }

  private persistEntries(entries: SiteCartEntry[]): void {
    this.cartEntriesState.set(entries);

    if (this.isBrowser) {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    }
  }

  private cleanupOrphanComplements(
    entries: SiteCartEntry[],
    cache: Record<string, SiteProduct>
  ): SiteCartEntry[] {
    if (!entries.length) {
      return entries;
    }

    const allTypesKnown = entries.every((entry) => cache[entry.productSlug] !== undefined);
    const hasGeneral = entries.some(
      (entry) => cache[entry.productSlug]?.type === 'GENERAL'
    );

    if (hasGeneral || !allTypesKnown) {
      return entries;
    }

    return entries.filter((entry) => cache[entry.productSlug]?.type !== 'COMPLEMENT');
  }

  private loadCartEntries(): SiteCartEntry[] {
    if (!this.isBrowser) {
      return [];
    }

    const rawValue = localStorage.getItem(this.storageKey);

    if (!rawValue) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
      return [];
    }

    try {
      const parsedValue: unknown = JSON.parse(rawValue);

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .filter(this.isValidCartEntry)
          .map((entry) => ({
            productSlug: entry.productSlug,
            quantity: Math.max(1, Math.floor(entry.quantity)),
          }));
      }
    } catch {
      localStorage.removeItem(this.storageKey);
    }

    localStorage.setItem(this.storageKey, JSON.stringify([]));
    return [];
  }

  private async refreshProductCacheForEntries(entries: SiteCartEntry[]): Promise<void> {
    const existingCache = this.productCacheState();
    const missingSlugs = entries
      .map((entry) => entry.productSlug)
      .filter((slug) => !existingCache[slug]);

    if (!missingSlugs.length) {
      return;
    }

    const loadedProducts: Record<string, SiteProduct> = { ...existingCache };

    await Promise.all(
      missingSlugs.map(async (productSlug) => {
        try {
          const apiProduct = await firstValueFrom(
            this.siteProductsApi.findBySlug(productSlug)
          );

          if (!apiProduct) {
            return;
          }

          const categories = Array.isArray((apiProduct as any).categories)
            ? (apiProduct as any).categories
            : [];
          loadedProducts[productSlug] = {
            id: (apiProduct as any).id,
            slug: productSlug,
            type: (apiProduct as any).type || 'GENERAL',
            name: (apiProduct as any).name,
            category: categories[0]?.name || 'Sin categoría',
            categorySlug: categories[0]?.slug || 'sin-categoria',
            categoryIds: categories.map((category: any) => category.id),
            categorySlugs: categories.map((category: any) => category.slug),
            price: (apiProduct as any).price,
            badge: '',
            stemCount: '',
            deliveryNote: '',
            description: (apiProduct as any).description || '',
            image: (apiProduct as any).image || '/assets/default.png',
            highlights: [],
          };
        } catch {
          // Ignore missing products and keep entries intact.
        }
      })
    );

    this.productCacheState.set(loadedProducts);

    const cleanedEntries = this.cleanupOrphanComplements(
      this.cartEntriesState(),
      loadedProducts
    );

    if (cleanedEntries.length !== this.cartEntriesState().length) {
      this.persistEntries(cleanedEntries);
    }
  }

  private isValidCartEntry(entry: unknown): entry is SiteCartEntry {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const candidate = entry as Partial<SiteCartEntry>;

    return (
      typeof candidate.productSlug === 'string' &&
      typeof candidate.quantity === 'number' &&
      Number.isFinite(candidate.quantity) &&
      candidate.quantity > 0
    );
  }
}
