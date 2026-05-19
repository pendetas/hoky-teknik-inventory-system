import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { formatCurrency, getShopeeReceivableAmount } from '../lib/utils';
import { AlertTriangle, Store, ShoppingBag } from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { buildTopSellableProductsForMonth } from '../lib/dashboardMetrics';

export const Dashboard = () => {
  const { products, shopeeSales, shopeeReturnCases, storeSales } = useInventory();
  
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const formatStats = () => {
    let shopeeRevenue = 0;
    let storeRevenue = 0;
    let returnedOrders = 0;
    let pendingReturnCases = 0;
    
    // Filter this week
    shopeeSales.forEach(sale => {
      const date = new Date(sale.date);
      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
        shopeeRevenue += getShopeeReceivableAmount(sale);
        if (sale.status === 'Returned') returnedOrders += 1;
      }
    });

    shopeeReturnCases.forEach(returnCase => {
      const date = new Date(returnCase.updatedAt);
      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
        if (returnCase.returnStatus === 'Barang Rusak - Dikompensasi') {
          shopeeRevenue += returnCase.compensationAmount;
        }
        if (returnCase.returnStatus === 'Barang Rusak - Menunggu Shopee') {
          pendingReturnCases += 1;
        }
      }
    });

    storeSales.forEach(sale => {
      const date = new Date(sale.date);
      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
        storeRevenue += (sale.price * sale.quantity);
      }
    });

    return { shopeeRevenue, storeRevenue, returnedOrders, pendingReturnCases };
  };

  const stats = formatStats();
  const lowStockProducts = products.filter(p => p.stock < 5);
  const topSellableProducts = buildTopSellableProductsForMonth(products, shopeeSales, storeSales, now);
  const highestSoldQuantity = Math.max(...topSellableProducts.map((product) => product.quantity), 0);

  const getShopeeProductSummary = (items: typeof shopeeSales[number]['items']) => {
    return items
      .map((item) => {
        const product = products.find(p => p.id === item.productId);
        return `${product?.name || 'Produk Tidak Dikenal'} x${item.quantity}`;
      })
      .join(', ');
  };

  const StatCard = ({ title, value, colorClass, subtitle }: any) => (
    <div className="bg-stone-50 border border-gray-200 p-5 flex flex-col shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 dark:text-[#8E9299]">{title}</span>
      <div className={`text-3xl font-bold font-mono ${colorClass}`}>{value}</div>
      {subtitle && <span className="text-[9px] uppercase tracking-widest text-gray-500 mt-2 block opacity-70 dark:text-[#8E9299]">{subtitle}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Produk" 
          value={products.length} 
          colorClass="text-gray-900 dark:text-[#E0E2E6]" 
        />
        <StatCard 
          title="Pendapatan Shopee" 
          value={formatCurrency(stats.shopeeRevenue)} 
          colorClass="text-gray-900 dark:text-[#E0E2E6]"
          subtitle="Minggu ini - order diterima + kompensasi retur"
        />
        <StatCard 
          title="Pendapatan Toko" 
          value={formatCurrency(stats.storeRevenue)} 
          colorClass="text-gray-900 dark:text-[#E0E2E6]" 
          subtitle="Minggu ini"
        />
        <StatCard 
          title="Order Masuk Retur" 
          value={stats.returnedOrders} 
          colorClass="text-[#FF4444]" 
          subtitle={`Minggu ini - ${stats.pendingReturnCases} kasus masih perlu dicek`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
          <div className="flex flex-col gap-1 mb-6">
            <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">01 / Produk Terlaris Bulan Ini</h3>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">Bulan ini berdasarkan quantity terjual</span>
          </div>

          {topSellableProducts.length === 0 ? (
            <div className="text-center py-8 text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E9299]">Belum ada produk terjual bulan ini.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {topSellableProducts.map((product) => {
                const barHeight = highestSoldQuantity > 0
                  ? `${Math.max(12, Math.round((product.quantity / highestSoldQuantity) * 100))}%`
                  : '0%';

                return (
                  <div key={product.id} className="flex min-h-[220px] flex-col justify-end">
                    <div className="flex h-40 items-end justify-center border-b border-gray-200 pb-2 dark:border-[#2A2D35]">
                      <div className="flex h-full w-full max-w-[82px] flex-col items-center justify-end gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">{product.quantity} unit</span>
                        <div className="flex h-full w-full items-end bg-stone-200 dark:bg-[#0F1115]">
                          <div
                            className="w-full bg-[#F27D26]"
                            style={{ height: barHeight }}
                          />
                        </div>
                      </div>
                    </div>
                    <span
                      className="mt-3 min-h-[32px] text-center text-[10px] font-bold uppercase leading-4 tracking-wide text-gray-900 dark:text-[#E0E2E6]"
                      title={product.name}
                    >
                      {product.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
          <h3 className="text-sm font-bold uppercase italic mb-6">02 / Aktivitas Terbaru</h3>
          {shopeeSales.length === 0 && storeSales.length === 0 ? (
            <div className="text-center py-8 text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E9299]">Tidak ada transaksi terbaru.</div>
          ) : (
            <div className="flex flex-col">
              {[...shopeeSales.map(s => ({...s, origin: 'Shopee' as const})), ...storeSales.map(s => ({...s, origin: 'Toko' as const}))]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((activity, i) => {
                  const productName = activity.origin === 'Shopee'
                    ? getShopeeProductSummary(activity.items)
                    : products.find(p => p.id === activity.productId)?.name || 'Produk Tidak Dikenal';
                  const quantity = activity.origin === 'Shopee'
                    ? activity.items.reduce((total, item) => total + item.quantity, 0)
                    : activity.quantity;
                  const amount = activity.origin === 'Shopee'
                    ? getShopeeReceivableAmount(activity)
                    : activity.price * activity.quantity;
                  return (
                    <div key={i} className="p-3 border-b border-gray-200 flex gap-3 opacity-90 hover:opacity-100 hover:bg-gray-100 dark:border-[#2A2D35] dark:hover:bg-[#1A1C21]">
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center text-[#F27D26] dark:bg-[#333]">
                        {activity.origin === 'Shopee' ? <ShoppingBag size={18} /> : <Store size={18} />}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="text-xs font-bold text-gray-900 dark:text-[#E0E2E6]">{productName}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider dark:text-[#8E9299]">
                          {activity.origin} - {new Date(activity.date).toLocaleDateString()}
                          {('status' in activity) ? ` - ${activity.status === 'Shipped' ? 'Dikirim' : activity.status === 'Delivered' ? 'Diterima' : activity.status === 'Returned' ? 'Diretur' : activity.status}` : ''}
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <div className="text-xs font-bold font-mono text-gray-950 dark:text-white">
                          {formatCurrency(amount)}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-[#8E9299]">{quantity} unit</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
          <h3 className="text-sm font-bold uppercase italic mb-6 text-[#FF4444] flex items-center gap-2">
            <AlertTriangle size={16} /> 03 / Peringatan Data
          </h3>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E9299]">Semua sistem normal.</div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 border-l-2 border-[#FF4444] bg-stone-100 dark:bg-[#0F1115]">
                  <span className="text-xs font-bold truncate max-w-[150px] text-gray-900 dark:text-[#E0E2E6]">{p.name}</span>
                  <span className="text-[10px] font-black tracking-widest text-[#FF4444]">{p.stock} TERSISA</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
