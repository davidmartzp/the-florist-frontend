import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SiteCartService } from '../../core/services/site-cart.service';
import { siteBrandAssets } from './site-content';

@Component({
  selector: 'app-site-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './site-layout.component.html',
  styleUrl: './site-layout.component.scss',
})
export class SiteLayoutComponent {
  private readonly siteCartService = inject(SiteCartService);

  protected readonly logoUrl = siteBrandAssets.logoPrimary;
  protected readonly footerLogoUrl = siteBrandAssets.logoWhite;
  protected readonly cartCount = this.siteCartService.cartCount;
  protected readonly currentYear = () => new Date().getFullYear();
  protected readonly navItemsBeforeCart = [
    { label: 'Inicio', route: '/' },
  ];

  protected readonly navItemsAfterCart = [
    { label: 'Checkout', route: '/checkout' },
  ];
}
