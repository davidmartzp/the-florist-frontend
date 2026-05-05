import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface FeaturedProduct {
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge: string;
}

export interface CategoryFilter {
  id: number | 'all';
  label: string;
}

@Component({
  selector: 'app-featured-products-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './featured-products-section.component.html',
  styleUrls: ['./featured-products-section.component.scss'],
})
export class FeaturedProductsSectionComponent {
  private readonly destroyRef = inject(DestroyRef);
  private filterTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true }) products: FeaturedProduct[] = [];
  @Input({ required: true }) filters: CategoryFilter[] = [];
  @Input() selectedFilterId: number | 'all' = 'all';
  @Input() isTransitioning = false;

  @Output() filterChange = new EventEmitter<number | 'all'>();
  @Output() imageError = new EventEmitter<Event>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.filterTransitionTimeout) {
        clearTimeout(this.filterTransitionTimeout);
      }
    });
  }

  protected onFilterClick(filterId: number | 'all'): void {
    if (this.selectedFilterId === filterId) {
      return;
    }

    if (this.filterTransitionTimeout) {
      clearTimeout(this.filterTransitionTimeout);
    }

    this.filterChange.emit(filterId);

    this.filterTransitionTimeout = setTimeout(() => {
      this.filterTransitionTimeout = null;
    }, 280);
  }

  protected onFilterSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const categoryId = value === 'all' ? 'all' : Number(value);

    if (categoryId !== 'all' && Number.isNaN(categoryId)) {
      return;
    }

    this.onFilterClick(categoryId);
  }

  protected isFilterActive(filterId: number | 'all'): boolean {
    return this.selectedFilterId === filterId;
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  protected onImageError(event: Event): void {
    this.imageError.emit(event);
  }
}
