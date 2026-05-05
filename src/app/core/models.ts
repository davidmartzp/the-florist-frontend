export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string | null;
}

export interface AccessControlCatalog {
  permissions: PermissionDefinition[];
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  permissions: string[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Catalog {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  hasVat: boolean;
  vatRate: number;
  stock: number;
  description: string | null;
  image: string | null;
  type: 'GENERAL' | 'COMPLEMENT' | 'MEMBERSHIP';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
  tags: Tag[];
  catalogs: Catalog[];
}

export interface ProductPriceHistoryEntry {
  id: number;
  productId: number;
  price: number;
  hasVat: boolean;
  vatRate: number;
  changeType: string;
  createdAt: string;
}

export interface ShippingMethod {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  hasVat: boolean;
  vatRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
}

export interface OrderShipping {
  shippingMethodId: number | null;
  name: string | null;
  price: number;
  includesPrice: boolean;
  appliedPrice: number;
}

export interface Order {
  id: number;
  code: string;
  userId: number;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'isActive'> | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  billingDocument: string | null;
  billingDocumentType: 'CC' | 'CE' | 'NIT' | 'PASAPORTE' | null;
  billingCity: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  includesCard: boolean;
  cardMessage: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  cardSignature: string | null;
  deliveryDate: string | null;
  shipping: OrderShipping | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  isPaid: boolean;
  isActive: boolean;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
