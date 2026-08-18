import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  permission?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly menuOpen = signal(false);

  protected readonly navItems = computed(() => {
    const items: NavItem[] = [
      { label: 'Resumen', route: '/admin-flowers' },
      { label: 'Usuarios', route: '/admin-flowers/users', permission: 'USERS' },
      { label: 'Categorías', route: '/admin-flowers/categories', permission: 'PRODUCTS' },
      { label: 'Catálogos', route: '/admin-flowers/catalogs', permission: 'PRODUCTS' },
      { label: 'Productos', route: '/admin-flowers/products', permission: 'PRODUCTS' },
      { label: 'Métodos de envío', route: '/admin-flowers/shipping-methods', permission: 'ORDERS' },
      { label: 'Órdenes', route: '/admin-flowers/orders', permission: 'ORDERS' },
    ];

    return items.filter((item) => !item.permission || this.authService.hasPermission(item.permission));
  });

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.menuOpen.set(false);
      }
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.authService.logout();
  }
}
