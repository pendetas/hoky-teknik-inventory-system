import { supabase } from '../lib/supabaseClient';
import { Product } from '../lib/types';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  current_stock: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  stock: row.current_stock,
  photoUrl: row.photo_url || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const productsService = {
  async listProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, current_stock, photo_url, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => toProduct(row as ProductRow));
  },

  async createProduct(product: ProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description,
        current_stock: product.stock,
        photo_url: product.photoUrl || null,
      })
      .select('id, name, description, current_stock, photo_url, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toProduct(data as ProductRow);
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.stock !== undefined && { current_stock: updates.stock }),
        ...(updates.photoUrl !== undefined && { photo_url: updates.photoUrl || null }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, description, current_stock, photo_url, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toProduct(data as ProductRow);
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },
};
