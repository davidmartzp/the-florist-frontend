import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { featuredProducts, formatPrice, siteCategories } from '../site-content';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
})
export class CatalogPageComponent {
  protected readonly categories = siteCategories;
  protected readonly products = featuredProducts;
  protected readonly formatPrice = formatPrice;
  protected readonly filters = ['Más vendidos', 'Entrega hoy', 'Ramos premium', 'Regalos especiales'];
}
