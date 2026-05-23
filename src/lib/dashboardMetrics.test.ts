import { buildTopSellableProductsForMonth } from './dashboardMetrics';
import { Product, ShopeeSale, StoreSale } from './types';

const products: Product[] = [
  {
    id: 'matrix',
    name: 'Matrix 4 Tak',
    description: '',
    stock: 10,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'atmoz',
    name: 'Atmoz Jet Sprayer',
    description: '',
    stock: 10,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
];

const shopeeSales: ShopeeSale[] = [
  {
    id: 'shopee-current-month',
    orderId: '1001',
    deliveryId: 'SPX1001',
    items: [{ id: 'item-1', productId: 'matrix', quantity: 3 }],
    price: 100000,
    finalReceiptAmount: null,
    receivableAmount: 100000,
    deliveryMethod: 'Shopee Xpress',
    purchaseMethod: 'Online Payment',
    note: '',
    status: 'Delivered',
    date: '2026-05-10T00:00:00Z',
    createdAt: '2026-05-10T00:00:00Z',
  },
  {
    id: 'shopee-previous-month',
    orderId: '1002',
    deliveryId: 'SPX1002',
    items: [{ id: 'item-2', productId: 'matrix', quantity: 20 }],
    price: 100000,
    finalReceiptAmount: null,
    receivableAmount: 100000,
    deliveryMethod: 'Shopee Xpress',
    purchaseMethod: 'Online Payment',
    note: '',
    status: 'Delivered',
    date: '2026-04-28T00:00:00Z',
    createdAt: '2026-04-28T00:00:00Z',
  },
  {
    id: 'shopee-returned',
    orderId: '1003',
    deliveryId: 'SPX1003',
    items: [{ id: 'item-3', productId: 'atmoz', quantity: 30 }],
    price: 100000,
    finalReceiptAmount: null,
    receivableAmount: 0,
    deliveryMethod: 'Shopee Xpress',
    purchaseMethod: 'Online Payment',
    note: '',
    status: 'Returned',
    date: '2026-05-12T00:00:00Z',
    createdAt: '2026-05-12T00:00:00Z',
  },
];

const storeSales: StoreSale[] = [
  {
    id: 'store-current-month',
    deliveryId: 'INV-1',
    productId: 'atmoz',
    quantity: 5,
    price: 50000,
    purchaseMethod: 'Cash',
    date: '2026-05-15T00:00:00Z',
    createdAt: '2026-05-15T00:00:00Z',
  },
  {
    id: 'store-previous-month',
    deliveryId: 'INV-2',
    productId: 'atmoz',
    quantity: 50,
    price: 50000,
    purchaseMethod: 'Cash',
    date: '2026-04-15T00:00:00Z',
    createdAt: '2026-04-15T00:00:00Z',
  },
];

const rows: Array<{ id: string; name: string; quantity: number }> = buildTopSellableProductsForMonth(
  products,
  shopeeSales,
  storeSales,
  new Date('2026-05-19T12:00:00Z')
);

void rows;
