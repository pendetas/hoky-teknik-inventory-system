import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, ShopeeReturnCase, ShopeeReturnStatus, ShopeeSale, StoreSale } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { productsService } from '../services/productsService';
import { shopeeOrdersService, ShopeeOrderInput, ShopeeOrderStatusInput } from '../services/shopeeOrdersService';

interface InventoryContextType {
  products: Product[];
  shopeeSales: ShopeeSale[];
  shopeeReturnCases: ShopeeReturnCase[];
  storeSales: StoreSale[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addShopeeSale: (sale: ShopeeOrderInput) => Promise<void>;
  updateShopeeSale: (id: string, sale: ShopeeOrderInput) => Promise<void>;
  updateShopeeSaleStatus: (id: string, status: ShopeeSale['status'] | ShopeeOrderStatusInput) => Promise<void>;
  updateShopeeReturnCase: (id: string, status: ShopeeReturnStatus, compensationAmount: number, note: string) => Promise<void>;
  deleteShopeeSale: (id: string) => Promise<void>;
  addStoreSale: (sale: Omit<StoreSale, 'id' | 'createdAt'>) => void;
  deleteStoreSale: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hoky-teknik-data';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shopeeSales, setShopeeSales] = useState<ShopeeSale[]>([]);
  const [shopeeReturnCases, setShopeeReturnCases] = useState<ShopeeReturnCase[]>([]);
  const [storeSales, setStoreSales] = useState<StoreSale[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadSupabaseInventory = async () => {
    const [loadedProducts, loadedShopeeSales, loadedShopeeReturnCases] = await Promise.all([
      productsService.listProducts(),
      shopeeOrdersService.listShopeeOrders(),
      shopeeOrdersService.listShopeeReturnCases(),
    ]);

    setProducts(loadedProducts);
    setShopeeSales(loadedShopeeSales);
    setShopeeReturnCases(loadedShopeeReturnCases);
  };

  // Load products and Shopee orders from Supabase. Store sales stay local until that workflow is migrated.
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStoreSales(data.storeSales || []);
      } catch (err) {
        console.error('Failed to parse local storage data', err);
      }
    }

    reloadSupabaseInventory()
      .catch((err) => {
        console.error('Failed to load inventory from Supabase', err);
        alert(`Gagal memuat data inventaris: ${err.message}`);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Keep store shipments in local storage until that table is migrated.
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        storeSales
      }));
    }
  }, [storeSales, isLoaded]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const createdProduct = await productsService.createProduct(product);
    setProducts((prev) => [createdProduct, ...prev]);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updatedProduct = await productsService.updateProduct(id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
  };

  const deleteProduct = async (id: string) => {
    await productsService.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addShopeeSale = async (sale: ShopeeOrderInput) => {
    await shopeeOrdersService.createShopeeOrder(sale);
    await reloadSupabaseInventory();
  };

  const updateShopeeSale = async (id: string, sale: ShopeeOrderInput) => {
    await shopeeOrdersService.updateShopeeOrder(id, sale);
    await reloadSupabaseInventory();
  };

  const updateShopeeSaleStatus = async (id: string, newStatus: ShopeeSale['status'] | ShopeeOrderStatusInput) => {
    await shopeeOrdersService.updateShopeeOrderStatus(id, newStatus);
    await reloadSupabaseInventory();
  };

  const updateShopeeReturnCase = async (
    id: string,
    status: ShopeeReturnStatus,
    compensationAmount: number,
    note: string
  ) => {
    await shopeeOrdersService.updateShopeeReturnCase(id, status, compensationAmount, note);
    await reloadSupabaseInventory();
  };

  const deleteShopeeSale = async (id: string) => {
    await shopeeOrdersService.deleteShopeeOrder(id);
    await reloadSupabaseInventory();
  };

  const addStoreSale = (sale: Omit<StoreSale, 'id' | 'createdAt'>) => {
    const newSale = { ...sale, id: uuidv4(), createdAt: new Date().toISOString() };
    setStoreSales((prev) => [...prev, newSale]);
    const updatedAt = new Date().toISOString();
    
    // Adjust product inventory (store sales always decrease inventory)
    setProducts((prev) => prev.map(p => {
      if (p.id === sale.productId) {
        return { ...p, stock: p.stock - sale.quantity, updatedAt };
      }
      return p;
    }));
  };

  const deleteStoreSale = (id: string) => {
    const sale = storeSales.find(s => s.id === id);
    if (sale) {
      const updatedAt = new Date().toISOString();
      // Revert inventory
      setProducts((prev) => prev.map(p => {
        if (p.id === sale.productId) {
          return { ...p, stock: p.stock + sale.quantity, updatedAt };
        }
        return p;
      }));
    }
    setStoreSales((prev) => prev.filter((s) => s.id !== id));
  };

  if (!isLoaded) return null; // Wait for local storage load

  return (
    <InventoryContext.Provider value={{
      products,
      shopeeSales,
      shopeeReturnCases,
      storeSales,
      addProduct,
      updateProduct,
      deleteProduct,
      addShopeeSale,
      updateShopeeSale,
      updateShopeeSaleStatus,
      updateShopeeReturnCase,
      deleteShopeeSale,
      addStoreSale,
      deleteStoreSale
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
