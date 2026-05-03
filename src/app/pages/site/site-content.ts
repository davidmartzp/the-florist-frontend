export interface SiteCategory {
  id?: number;
  slug: string;
  name: string;
  description: string | null;
  image?: string;
  accent?: string;
}

export interface SiteProduct {
  id?: number;
  slug: string;
  name: string;
  type: 'GENERAL' | 'COMPLEMENT' | 'MEMBERSHIP';
  category: string;
  categorySlug: string;
  categoryIds?: number[];
  categorySlugs?: string[];
  price: number;
  badge: string;
  stemCount: string;
  deliveryNote: string;
  description: string;
  image: string;
  highlights: string[];
}

export interface SiteCartEntry {
  productSlug: string;
  quantity: number;
}

export const siteBrandAssets = {
  logoPrimary: '/assets/brand/la-floreria-logo-horizontal-green.png',
  logoWhite: '/assets/brand/la-floreria-logo-horizontal-white.png',
  logoSeal: '/assets/brand/la-floreria-seal-green.png',
};

export const siteCategories: SiteCategory[] = [
  {
    slug: 'ramos-bouquets',
    name: 'Ramos & Bouquets',
    description: 'Bouquets listos para regalar con texturas suaves y flores de temporada.',
    image:
      'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80',
    accent: 'Regala flores',
  },
  {
    slug: 'arreglos-florales',
    name: 'Arreglos florales',
    description: 'Composiciones premium para celebraciones, eventos y momentos memorables.',
    image:
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80',
    accent: 'Diseño floral',
  },
  {
    slug: 'flores-por-variedad',
    name: 'Flores por variedad',
    description: 'Claveles, mini claveles, star, solomio, raffine y green ball.',
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
    accent: 'Directo del cultivo',
  },
  {
    slug: 'ocasiones-especiales',
    name: 'Ocasiones especiales',
    description: 'Productos pensados para cumpleaños, aniversarios y agradecimientos.',
    image:
      'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?auto=format&fit=crop&w=900&q=80',
    accent: 'Momentos únicos',
  },
];

export const featuredProducts: SiteProduct[] = [
  {
    slug: 'bouquet-claveles-colon',
    type: 'GENERAL',
    name: 'Ramo de Claveles Colón',
    category: 'Ramos & Bouquets',
    categorySlug: 'ramos-bouquets',
    price: 129900,
    badge: 'Best seller',
    stemCount: '24 tallos premium',
    deliveryNote: 'Entrega el mismo día en Bogotá',
    description:
      'Una mezcla de claveles y mini claveles con follajes ligeros, pensada para regalar frescura con un look elegante y atemporal.',
    image:
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80',
    highlights: ['Tarjeta personalizada', 'Empaque premium', 'Duración estimada 8-10 días'],
  },
  {
    slug: 'arreglo-floral-premium',
    type: 'GENERAL',
    name: 'Arreglo Floral Premium',
    category: 'Arreglos florales',
    categorySlug: 'arreglos-florales',
    price: 189900,
    badge: 'Edición especial',
    stemCount: 'Arreglo mediano',
    deliveryNote: 'Incluye florero de vidrio',
    description:
      'Arreglo con paleta cálida en tonos terracota, crema y sage para mesas especiales y celebraciones en casa.',
    image:
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80',
    highlights: ['Florero incluido', 'Combinación curada', 'Hecho por diseñadores florales'],
  },
  {
    slug: 'seleccion-green-ball',
    type: 'GENERAL',
    name: 'Selección Green Ball',
    category: 'Flores por variedad',
    categorySlug: 'flores-por-variedad',
    price: 99900,
    badge: 'Directo del cultivo',
    stemCount: '20 tallos seleccionados',
    deliveryNote: 'Ideal para floristas y amantes del DIY',
    description:
      'Ramo monocromático con textura orgánica para quienes buscan una pieza sobria, moderna y muy fresca.',
    image:
      'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=900&q=80',
    highlights: ['Frescura garantizada', 'Origen trazable', 'Perfecto para arreglos propios'],
  },
  {
    slug: 'bouquet-raffine',
    type: 'GENERAL',
    name: 'Bouquet Raffine',
    category: 'Ocasiones especiales',
    categorySlug: 'ocasiones-especiales',
    price: 154900,
    badge: 'Aniversarios',
    stemCount: 'Bouquet de autor',
    deliveryNote: 'Mensaje premium incluido',
    description:
      'Bouquet romántico con raffine y flores complementarias para aniversarios, fechas especiales y regalos memorables.',
    image:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80',
    highlights: ['Empaque crema', 'Listo para obsequiar', 'Diseño delicado y natural'],
  },
  {
    slug: 'detalle-star',
    type: 'GENERAL',
    name: 'Detalle Star',
    category: 'Ramos & Bouquets',
    categorySlug: 'ramos-bouquets',
    price: 86900,
    badge: 'Nuevo',
    stemCount: '12 tallos',
    deliveryNote: 'Formato pequeño y elegante',
    description:
      'Bouquet compacto con presencia y textura, perfecto para detalles espontáneos o agradecimientos.',
    image:
      'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80',
    highlights: ['Formato pequeño', 'Muy fácil de regalar', 'Paleta suave y femenina'],
  },
];

export const complementProducts: SiteProduct[] = [
  {
    slug: 'tarjeta-personalizada',
    type: 'COMPLEMENT',
    name: 'Tarjeta personalizada',
    category: 'Complementos',
    categorySlug: 'complementos',
    price: 12900,
    badge: 'Añade un detalle',
    stemCount: '',
    deliveryNote: 'Incluye mensaje manuscrito',
    description: 'Agrega una tarjeta con mensaje personalizado para que el regalo sea aún más especial.',
    image: '/assets/default.png',
    highlights: ['Mensaje incluido', 'Envio con el pedido', 'Tamaño compacto'],
  },
  {
    slug: 'bouquet-mini',
    type: 'COMPLEMENT',
    name: 'Mini bouquet adicional',
    category: 'Complementos',
    categorySlug: 'complementos',
    price: 49900,
    badge: 'Perfecto como extra',
    stemCount: '',
    deliveryNote: 'Pequeño arreglo extra',
    description: 'Un mini bouquet pensado para complementar el regalo principal con un toque extra de flores.',
    image: '/assets/default.png',
    highlights: ['Complementa tu pedido', 'Formato práctico', 'Ideal para detalles'],
  },
  {
    slug: 'envio-express',
    type: 'COMPLEMENT',
    name: 'Envío express',
    category: 'Complementos',
    categorySlug: 'complementos',
    price: 19000,
    badge: 'Entrega rápida',
    stemCount: '',
    deliveryNote: 'Entrega en menos de 4 horas',
    description: 'Prioriza tu envío para que llegue más rápido sin perder la frescura del producto.',
    image: '/assets/default.png',
    highlights: ['Entrega urgente', 'Notificación personal', 'Disponible en Bogotá'],
  },
];

export const siteProducts: SiteProduct[] = [...featuredProducts, ...complementProducts];

export const siteStats = [
  { value: '40+', label: 'años cultivando flores colombianas' },
  { value: '6', label: 'variedades protagonistas en nuestra selección' },
  { value: '24h', label: 'promesa de frescura desde el cultivo' },
  { value: '1984', label: 'tradición familiar que inspira la marca' },
];

export const siteCommitments = [
  'Calidad garantizada en cada selección.',
  'Frescura directa del cultivo al detalle final.',
  'Sostenibilidad y procesos responsables.',
  'Acompañamiento cercano antes y después de la compra.',
];

export const siteCartItems: SiteCartEntry[] = [
  { productSlug: 'bouquet-claveles-colon', quantity: 1 },
  { productSlug: 'bouquet-raffine', quantity: 1 },
  { productSlug: 'detalle-star', quantity: 2 },
];

export const formatPrice = (price: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);

export const findProductBySlug = (slug: string | null): SiteProduct | undefined =>
  siteProducts.find((product) => product.slug === slug);
