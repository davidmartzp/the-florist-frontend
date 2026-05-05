import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { extractErrorMessage } from '../../../core/api.utils';
import { AuthService } from '../../../core/services/auth.service';
import { OrdersApiService } from '../../../core/services/orders-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div class="page-header__title">
          <h1 class="page-title">Panel principal</h1>
          <p class="page-subtitle">Resumen operativo — usuarios, productos y órdenes</p>
        </div>
      </header>

      <div class="card-grid">
        <article
          class="dash-card dash-card--user"
          [class.dash-card--clickable]="authService.hasPermission('USERS')"
          (click)="goTo('/admin-flowers/users')"
        >
          <div class="dash-card__icon"><i class="fas fa-user"></i></div>
          <div class="dash-card__body">
            <h3>Usuario activo</h3>
            <p *ngIf="authService.currentUser() as user">{{ user.firstName }} {{ user.lastName }}</p>
            <small *ngIf="authService.currentUser() as user">{{ user.email }}</small>
          </div>
          <div class="dash-card__arrow" *ngIf="authService.hasPermission('USERS')"><i class="fas fa-chevron-right"></i></div>
        </article>

        <article
          class="dash-card dash-card--orders"
          [class.dash-card--clickable]="authService.hasPermission('ORDERS')"
          (click)="goTo('/admin-flowers/orders')"
        >
          <div class="dash-card__icon"><i class="fas fa-shopping-bag"></i></div>
          <div class="dash-card__body">
            <h3>Órdenes nuevas</h3>
            <p class="metric-value">{{ pendingOrdersCount }}</p>
            <small>{{ pendingOrdersLabel }}</small>
          </div>
          <div class="dash-card__arrow" *ngIf="authService.hasPermission('ORDERS')"><i class="fas fa-chevron-right"></i></div>
        </article>

        <article
          class="dash-card dash-card--stock"
          [class.dash-card--clickable]="authService.hasPermission('PRODUCTS')"
          (click)="goTo('/admin-flowers/products')"
        >
          <div class="dash-card__icon"><i class="fas fa-box-open"></i></div>
          <div class="dash-card__body">
            <h3>Sin stock</h3>
            <p class="metric-value">{{ outOfStockCount }}</p>
            <small>{{ outOfStockLabel }}</small>
          </div>
          <div class="dash-card__arrow" *ngIf="authService.hasPermission('PRODUCTS')"><i class="fas fa-chevron-right"></i></div>
        </article>
      </div>
    </section>
  `,
})
export class DashboardPageComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly productsApi = inject(ProductsApiService);

  protected pendingOrdersCount = 0;
  protected pendingOrdersLabel = 'Cargando...';
  protected outOfStockCount = 0;
  protected outOfStockLabel = 'Cargando...';

  ngOnInit(): void {
    this.loadPendingOrders();
    this.loadOutOfStockProducts();
  }

  protected goTo(route: string): void {
    if (!this.authService.hasPermission(this.routeToPermission(route))) {
      return;
    }
    this.router.navigate([route]);
  }

  private routeToPermission(route: string): string {
    if (route.includes('/users')) return 'USERS';
    if (route.includes('/orders')) return 'ORDERS';
    if (route.includes('/products') || route.includes('/categories') || route.includes('/catalogs')) return 'PRODUCTS';
    return '';
  }

  private loadPendingOrders(): void {
    if (!this.authService.hasPermission('ORDERS')) {
      this.pendingOrdersLabel = 'Sin acceso al módulo';
      return;
    }

    this.ordersApi.list({
      page: 1,
      pageSize: 1,
      status: 'pending',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        this.pendingOrdersCount = response.pagination.totalItems;
        this.pendingOrdersLabel = this.pendingOrdersCount === 1
          ? '1 orden pendiente'
          : `${this.pendingOrdersCount} órdenes pendientes`;
      },
      error: (error) => {
        this.pendingOrdersCount = 0;
        this.pendingOrdersLabel = extractErrorMessage(error);
      },
    });
  }

  private loadOutOfStockProducts(): void {
    if (!this.authService.hasPermission('PRODUCTS')) {
      this.outOfStockLabel = 'Sin acceso al módulo';
      return;
    }

    this.productsApi.list({
      page: 1,
      pageSize: 1,
      inStock: 'false',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        this.outOfStockCount = response.pagination.totalItems;
        this.outOfStockLabel = this.outOfStockCount === 1
          ? '1 producto agotado'
          : `${this.outOfStockCount} productos agotados`;
      },
      error: (error) => {
        this.outOfStockCount = 0;
        this.outOfStockLabel = extractErrorMessage(error);
      },
    });
  }
}
