import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { extractErrorMessage } from '../../../core/api.utils';
import { AuthService } from '../../../core/services/auth.service';
import { OrdersApiService } from '../../../core/services/orders-api.service';

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
        <article class="summary-card">
          <h3>Usuario activo</h3>
          <p *ngIf="authService.currentUser() as user">{{ user.firstName }} {{ user.lastName }}</p>
          <small *ngIf="authService.currentUser() as user">{{ user.email }}</small>
        </article>

        <article class="summary-card">
          <h3>Órdenes nuevas</h3>
          <p class="metric-value">{{ pendingOrdersCount }}</p>
          <small>{{ pendingOrdersLabel }}</small>
        </article>

        <article class="summary-card">
          <h3>Permisos activos</h3>
          <p>{{ availableModules || 'Sin módulos habilitados' }}</p>
          <small>El menú lateral se adapta a estos permisos</small>
        </article>
      </div>
    </section>
  `,
})
export class DashboardPageComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly ordersApi = inject(OrdersApiService);
  protected readonly availableModules = ['USERS', 'PRODUCTS', 'ORDERS']
    .filter((permission) => this.authService.hasPermission(permission))
    .join(' · ');
  protected readonly moduleCount = ['USERS', 'PRODUCTS', 'ORDERS']
    .filter((permission) => this.authService.hasPermission(permission))
    .length;
  protected pendingOrdersCount = 0;
  protected pendingOrdersLabel = 'Cargando órdenes pendientes...';

  ngOnInit(): void {
    if (!this.authService.hasPermission('ORDERS')) {
      this.pendingOrdersLabel = 'Tu perfil no tiene acceso al módulo de órdenes';
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
          ? 'Hay 1 orden nueva pendiente por revisar'
          : `Hay ${this.pendingOrdersCount} órdenes nuevas pendientes por revisar`;
      },
      error: (error) => {
        this.pendingOrdersCount = 0;
        this.pendingOrdersLabel = extractErrorMessage(error);
      },
    });
  }
}
