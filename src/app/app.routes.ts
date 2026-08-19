import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { BannersPageComponent } from './pages/cms/banners/banners-page.component';
import { CatalogsPageComponent } from './pages/cms/catalogs/catalogs-page.component';
import { CategoriesPageComponent } from './pages/cms/categories/categories-page.component';
import { DashboardPageComponent } from './pages/cms/dashboard/dashboard-page.component';
import { LoginPageComponent } from './pages/cms/login/login-page.component';
import { OrdersPageComponent } from './pages/cms/orders/orders-page.component';
import { ProductsPageComponent } from './pages/cms/products/products-page.component';
import { ShippingMethodsPageComponent } from './pages/cms/shipping-methods/shipping-methods-page.component';
import { UsersPageComponent } from './pages/cms/users/users-page.component';
import { CartPageComponent } from './pages/site/cart/cart-page.component';
import { CatalogPageComponent } from './pages/site/catalog/catalog-page.component';
import { CheckoutPageComponent } from './pages/site/checkout/checkout-page.component';
import { HomePageComponent } from './pages/site/home/home-page.component';
import { ProductDetailPageComponent } from './pages/site/product-detail/product-detail-page.component';
import { SiteLayoutComponent } from './pages/site/site-layout.component';

export const routes: Routes = [
  {
    path: 'admin-flowers',
    children: [
      { path: 'login', component: LoginPageComponent },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [authGuard],
        children: [
          { path: '', component: DashboardPageComponent },
          { path: 'users', component: UsersPageComponent, canActivate: [permissionGuard], data: { permission: 'USERS' } },
          { path: 'categories', component: CategoriesPageComponent, canActivate: [permissionGuard], data: { permission: 'PRODUCTS' } },
          { path: 'catalogs', component: CatalogsPageComponent, canActivate: [permissionGuard], data: { permission: 'PRODUCTS' } },
          { path: 'banners', component: BannersPageComponent, canActivate: [permissionGuard], data: { permission: 'ADMIN' } },
          { path: 'products', component: ProductsPageComponent, canActivate: [permissionGuard], data: { permission: 'PRODUCTS' } },
          { path: 'shipping-methods', component: ShippingMethodsPageComponent, canActivate: [permissionGuard], data: { permission: 'ORDERS' } },
          { path: 'orders', component: OrdersPageComponent, canActivate: [permissionGuard], data: { permission: 'ORDERS' } },
        ],
      },
    ],
  },
  {
    path: '',
    component: SiteLayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'catalogo', component: CatalogPageComponent },
      { path: 'producto/:slug', component: ProductDetailPageComponent },
      { path: 'carrito', component: CartPageComponent },
      { path: 'checkout', component: CheckoutPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
