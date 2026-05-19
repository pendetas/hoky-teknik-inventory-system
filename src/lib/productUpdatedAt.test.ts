import { Product } from './types';

const productWithUpdatedAt: Product = {
  id: 'product-1',
  name: 'Atmoz Jet Sprayer',
  description: 'Test product',
  stock: 12,
  createdAt: '2026-05-19T00:00:00Z',
  updatedAt: '2026-05-19T08:00:00Z',
};

// @ts-expect-error Product cards require updatedAt for restock traceability.
const productMissingUpdatedAt: Product = {
  id: 'product-2',
  name: 'Matrix 4 Tak',
  description: 'Test product',
  stock: 5,
  createdAt: '2026-05-19T00:00:00Z',
};

void productWithUpdatedAt;
void productMissingUpdatedAt;
