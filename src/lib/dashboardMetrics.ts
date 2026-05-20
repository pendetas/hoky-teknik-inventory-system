import { endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { Product, ShopeeReturnCase, ShopeeSale, StoreSale } from './types';

export type TopSellableProduct = {
  id: string;
  name: string;
  quantity: number;
};

export type BrandSalesProduct = {
  id: string;
  name: string;
  quantity: number;
};

export type BrandSalesRow = {
  brand: string;
  quantity: number;
  products: BrandSalesProduct[];
};

const getProductBrand = (productName: string) => productName.trim().split(/\s+/)[0]?.toUpperCase() || 'LAINNYA';

const addProductQuantity = (
  quantityByProductId: Map<string, number>,
  productId: string,
  quantity: number
) => {
  quantityByProductId.set(productId, (quantityByProductId.get(productId) || 0) + quantity);
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
    if (
      !isWithinInterval(saleDate, { start: monthStart, end: monthEnd }) ||
      !['Shipped', 'Delivered'].includes(sale.status)
    ) return;

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

export const buildBrandSalesRowsForMonth = (
  products: Product[],
  shopeeSales: ShopeeSale[],
  shopeeReturnCases: ShopeeReturnCase[],
  date: Date,
  maxRows = 8
): BrandSalesRow[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const quantityByProductId = new Map<string, number>();

  shopeeSales.forEach((sale) => {
    const saleDate = new Date(sale.date);
    if (!isWithinInterval(saleDate, { start: monthStart, end: monthEnd }) || sale.status !== 'Delivered') return;

    sale.items.forEach((item) => addProductQuantity(quantityByProductId, item.productId, item.quantity));
  });

  shopeeReturnCases.forEach((returnCase) => {
    const returnDate = new Date(returnCase.updatedAt);
    if (
      !isWithinInterval(returnDate, { start: monthStart, end: monthEnd }) ||
      returnCase.returnStatus !== 'Barang Rusak - Dikompensasi'
    ) return;

    returnCase.order.items.forEach((item) => addProductQuantity(quantityByProductId, item.productId, item.quantity));
  });

  const rowsByBrand = new Map<string, BrandSalesRow>();

  Array.from(quantityByProductId.entries()).forEach(([productId, quantity]) => {
    const product = products.find((candidate) => candidate.id === productId);
    const name = product?.name || 'Produk Tidak Dikenal';
    const brand = getProductBrand(name);
    const row = rowsByBrand.get(brand) || { brand, quantity: 0, products: [] };

    row.quantity += quantity;
    row.products.push({ id: productId, name, quantity });
    rowsByBrand.set(brand, row);
  });

  return Array.from(rowsByBrand.values())
    .map((row) => ({
      ...row,
      products: row.products.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.brand.localeCompare(b.brand))
    .slice(0, maxRows);
};
