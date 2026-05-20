import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { formatCurrency, getShopeeReceivableAmount } from '../lib/utils';
import { ChevronLeft, ChevronRight, Store, ShoppingBag } from 'lucide-react';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { buildBrandSalesRowsForMonth } from '../lib/dashboardMetrics';

const ACTIVITY_PAGE_SIZE = 10;

export const Dashboard = () => {
  const { products, shopeeSales, shopeeReturnCases, storeSales } = useInventory();
  const [currentActivityPage, setCurrentActivityPage] = React.useState(1);
  
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
  const brandSalesRows = buildBrandSalesRowsForMonth(products, shopeeSales, shopeeReturnCases, now);
  const highestBrandQuantity = Math.max(...brandSalesRows.map((brand) => brand.quantity), 0);
  const recentActivities = [...shopeeSales.map(s => ({...s, origin: 'Shopee' as const})), ...storeSales.map(s => ({...s, origin: 'Toko' as const}))]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalActivityPages = Math.max(1, Math.ceil(recentActivities.length / ACTIVITY_PAGE_SIZE));
  const activeActivityPage = Math.min(currentActivityPage, totalActivityPages);
  const firstActivityIndex = (activeActivityPage - 1) * ACTIVITY_PAGE_SIZE;
  const paginatedRecentActivities = recentActivities.slice(firstActivityIndex, firstActivityIndex + ACTIVITY_PAGE_SIZE);

  const getShopeeProductSummary = (items: typeof shopeeSales[number]['items']) => {
    return items
      .map((item) => {
        const product = products.find(p => p.id === item.productId);
        return `${product?.name || 'Produk Tidak Dikenal'} x${item.quantity}`;
      })
      .join(', ');
  };

  const getShopeeStatusLabel = (status: typeof shopeeSales[number]['status']) => {
    if (status === 'Shipped') return 'Dikirim';
    if (status === 'Delivered') return 'Diterima';
    if (status === 'Returned') return 'Diretur';
    if (status === 'Postponed') return 'Ditunda';
    if (status === 'Cancelled') return 'Dibatal';
    return status;
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
            <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">01 / Penjualan Brand Bulan Ini</h3>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">Berdasarkan order diterima dan retur yang dikompensasi Shopee</span>
          </div>

          {brandSalesRows.length === 0 ? (
            <div className="text-center py-8 text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E9299]">Belum ada brand dengan penjualan diakui bulan ini.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {brandSalesRows.map((brandRow) => {
                const barHeight = highestBrandQuantity > 0
                  ? `${Math.max(12, Math.round((brandRow.quantity / highestBrandQuantity) * 100))}%`
                  : '0%';

                return (
                  <div key={brandRow.brand} className="group relative flex min-h-[220px] flex-col justify-end">
                    <div className="flex h-40 items-end justify-center border-b border-gray-200 pb-2 dark:border-[#2A2D35]">
                      <div className="flex h-full w-full max-w-[82px] flex-col items-center justify-end gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">{brandRow.quantity} unit</span>
                        <div className="flex h-full w-full items-end bg-stone-200 dark:bg-[#0F1115]">
                          <div
                            className="w-full bg-[#F27D26] transition-all duration-200 group-hover:brightness-110"
                            style={{ height: barHeight }}
                          />
                        </div>
                      </div>
                    </div>
                    <span
                      className="mt-3 min-h-[32px] text-center text-[10px] font-bold uppercase leading-4 tracking-wide text-gray-900 dark:text-[#E0E2E6]"
                      title={brandRow.brand}
                    >
                      {brandRow.brand}
                    </span>
                    <div className="pointer-events-none absolute bottom-[68px] left-1/2 z-30 hidden w-64 -translate-x-1/2 border border-gray-200 bg-white p-3 text-left shadow-xl group-hover:block dark:border-[#333] dark:bg-[#111]">
                      <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-200 pb-2 dark:border-[#333]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-[#E0E2E6]">{brandRow.brand}</span>
                        <span className="font-mono text-[10px] font-black text-[#F27D26]">{brandRow.quantity} unit</span>
                      </div>
                      <div className="space-y-1.5">
                        {brandRow.products.map((product) => (
                          <div key={product.id} className="flex items-start justify-between gap-3 text-[10px] font-bold text-gray-600 dark:text-[#A0A0A0]">
                            <span className="min-w-0 leading-4">{product.name}</span>
                            <span className="shrink-0 font-mono text-gray-900 dark:text-white">{product.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
          <div className="mb-6 flex flex-col gap-1">
            <h3 className="text-sm font-bold uppercase italic">02 / Aktivitas Terbaru</h3>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
              {recentActivities.length} aktivitas order - {ACTIVITY_PAGE_SIZE} per halaman
            </span>
          </div>
          {shopeeSales.length === 0 && storeSales.length === 0 ? (
            <div className="text-center py-8 text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E9299]">Tidak ada transaksi terbaru.</div>
          ) : (
            <>
              <div className="flex flex-col">
                {paginatedRecentActivities
                .map((activity) => {
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
                    <div key={`${activity.origin}-${activity.id}`} className="p-3 border-b border-gray-200 flex gap-3 opacity-90 hover:opacity-100 hover:bg-gray-100 dark:border-[#2A2D35] dark:hover:bg-[#1A1C21]">
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center text-[#F27D26] dark:bg-[#333]">
                        {activity.origin === 'Shopee' ? <ShoppingBag size={18} /> : <Store size={18} />}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="text-xs font-bold text-gray-900 dark:text-[#E0E2E6]">{productName}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider dark:text-[#8E9299]">
                          {activity.origin} - {new Date(activity.date).toLocaleDateString()}
                          {` - No. Resi: ${activity.deliveryId || '-'}`}
                          {('status' in activity) ? ` - ${getShopeeStatusLabel(activity.status)}` : ''}
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

              {recentActivities.length > ACTIVITY_PAGE_SIZE && (
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:border-[#2A2D35] dark:text-[#8E9299] sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Menampilkan {firstActivityIndex + 1}-{Math.min(firstActivityIndex + ACTIVITY_PAGE_SIZE, recentActivities.length)} dari {recentActivities.length} aktivitas
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Halaman {activeActivityPage} / {totalActivityPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentActivityPage((page) => Math.max(1, page - 1))}
                      disabled={activeActivityPage === 1}
                      className="flex h-7 w-7 items-center justify-center border border-gray-300 text-gray-700 transition-colors hover:border-[#F97316] hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:border-[#F97316] dark:hover:text-[#F97316]"
                      title="Halaman sebelumnya"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentActivityPage((page) => Math.min(totalActivityPages, page + 1))}
                      disabled={activeActivityPage === totalActivityPages}
                      className="flex h-7 w-7 items-center justify-center border border-gray-300 text-gray-700 transition-colors hover:border-[#F97316] hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:border-[#F97316] dark:hover:text-[#F97316]"
                      title="Halaman berikutnya"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
