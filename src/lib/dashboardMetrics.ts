import { endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { Product, ShopeeSale, StoreSale } from './types';

export type TopSellableProduct = {
  id: string;
  name: string;
  quantity: number;
};

export const buildTopSellableProductsForMonth = (
  products: Product[],
  shopeeSales: ShopeeSale[],
  storeSales: StoreSale[],
  date: Date,
  maxRows = 5
): TopSellableProduct[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const soldQuantityByProduct = new Map<string, number>();

  shopeeSales.forEach((sale) => {
    const saleDate = new Date(sale.date);
    if (!isWithinInterval(saleDate, { start: monthStart, end: monthEnd }) || sale.status === 'Returned') return;

    sale.items.forEach((item) => {
      soldQuantityByProduct.set(
        item.productId,
        (soldQuantityByProduct.get(item.productId) || 0) + item.quantity
      );
    });
  });

  storeSales.forEach((sale) => {
    const saleDate = new Date(sale.date);
    if (!isWithinInterval(saleDate, { start: monthStart, end: monthEnd })) return;

    soldQuantityByProduct.set(
      sale.productId,
      (soldQuantityByProduct.get(sale.productId) || 0) + sale.quantity
    );
  });

  return Array.from(soldQuantityByProduct.entries())
    .map(([productId, quantity]) => ({
      id: productId,
      name: products.find((product) => product.id === productId)?.name || 'Produk Tidak Dikenal',
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, maxRows);
};
