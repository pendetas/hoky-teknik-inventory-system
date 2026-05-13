type TopProductItem = {
  productId: string;
  quantity: number;
};

export const buildTopProductBarRows = (
  items: TopProductItem[],
  getProductName: (productId: string) => string,
  maxRows = 10
) => {
  const quantityByProduct = items.reduce<Map<string, number>>((totals, item) => {
    totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity);
    return totals;
  }, new Map());

  const rankedProducts = Array.from(quantityByProduct.entries())
    .map(([productId, quantity]) => ({
      productName: getProductName(productId),
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity || a.productName.localeCompare(b.productName))
    .slice(0, maxRows);

  if (rankedProducts.length === 0) {
    return [['-', 'Belum ada produk terjual', 0, '']];
  }

  const highestQuantity = Math.max(...rankedProducts.map((product) => product.quantity));

  return rankedProducts.map((product, index) => {
    const barLength = Math.max(1, Math.round((product.quantity / highestQuantity) * 24));

    return [
      index + 1,
      product.productName,
      product.quantity,
      '█'.repeat(barLength),
    ];
  });
};
