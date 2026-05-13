import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Download, CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, format } from 'date-fns';
import * as XLSX from 'xlsx';
import { buildTopProductBarRows } from '../lib/reportUtils';

export const Reports = () => {
  const { products, storeSales } = useInventory();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = minggu ini, 1 = minggu lalu, dst.

  const generateReport = () => {
    const today = new Date();
    const targetDate = subWeeks(today, selectedWeek);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 }); // Senin
    const end = endOfWeek(targetDate, { weekStartsOn: 1 }); // Minggu

    // Filter data
    const weeklyStore = storeSales.filter(s => isWithinInterval(new Date(s.date), { start, end }));

    // Prepare Sheet Strings
    const dateRangeStr = `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`;

    // 1. Summary Sheet
    let totalStoreRevenue = 0;
    let totalStoreQty = 0;
    weeklyStore.forEach(s => {
      totalStoreRevenue += (s.price * s.quantity);
      totalStoreQty += s.quantity;
    });
    const getProductName = (productId: string) => {
      return products.find((product) => product.id === productId)?.name || 'Tidak diketahui';
    };
    const topSellableRows = buildTopProductBarRows(
      weeklyStore.map((sale) => ({
        productId: sale.productId,
        quantity: sale.quantity,
      })),
      getProductName
    );

    const summaryData = [
      ["SISTEM INVENTARIS HOKY TEKNIK - LAPORAN TOKO MINGGUAN"],
      ["Rentang Tanggal:", dateRangeStr],
      [],
      ["METRIK", "NILAI"],
      ["Total Pendapatan Toko", totalStoreRevenue],
      ["Total Pengiriman Toko", weeklyStore.length],
      ["Total Quantity Toko", totalStoreQty],
      ["Total Produk di Inventaris", products.length],
      [],
      ["PRODUK TERLARIS", "QTY TERJUAL", "BAR CHART"],
      ["Berdasarkan penjualan toko pada periode laporan"],
      ["Rank", "Nama Produk", "Quantity", "Bar Chart"],
      ...topSellableRows,
    ];

    // 3. Store Sales Sheet
    const storeData = [
      ["ID", "Tanggal", "Nama Produk", "Jumlah", "Harga/Unit", "Total", "ID Pengiriman", "Metode Pembayaran", "Jatuh Tempo"],
      ...weeklyStore.map(s => {
        return [
          s.id,
          format(new Date(s.date), 'yyyy-MM-dd'),
          getProductName(s.productId),
          s.quantity,
          s.price,
          s.quantity * s.price,
          s.deliveryId || '-',
          s.purchaseMethod,
          s.deadline ? format(new Date(s.deadline), 'yyyy-MM-dd') : '-'
        ];
      })
    ];

    // 4. Current Inventory Status
    const inventoryData = [
      ["ID Produk", "Nama", "Deskripsi", "Sisa Stok"],
      ...products.map(p => [
        p.id,
        p.name,
        p.description || '-',
        p.stock
      ])
    ];

    // Create Workbooks
    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 14 },
      { wch: 28 },
    ];
    const wsStore = XLSX.utils.aoa_to_sheet(storeData);
    const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsStore, "Penjualan Toko");
    XLSX.utils.book_append_sheet(wb, wsInventory, "Stok Inventaris");

    // Start File Download
    XLSX.writeFile(wb, `Laporan_Toko_Hoky_Teknik_${format(start, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-stone-50 p-6 border border-gray-200 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gray-200 text-[#F27D26] flex items-center justify-center dark:bg-[#333]">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase italic text-gray-900 mb-1 dark:text-[#E0E2E6]">Laporan Toko Mingguan</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Ekspor data pengiriman toko dan inventaris ke Excel.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 border border-gray-200 dark:bg-[#1A1C21] dark:border-[#333740]">
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2 dark:text-[#8E9299]">
              <CalendarIcon size={14} className="text-[#F27D26]" /> Pilih Minggu
            </label>
            <select 
              className="w-full px-4 py-3 bg-stone-50 border border-gray-300 focus:outline-none focus:border-[#F27D26] font-mono text-sm text-gray-900 dark:bg-[#090A0C] dark:border-[#333740] dark:text-[#E0E2E6]"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map(num => {
                const target = subWeeks(new Date(), num);
                const start = startOfWeek(target, { weekStartsOn: 1 });
                const end = endOfWeek(target, { weekStartsOn: 1 });
                return (
                  <option key={num} value={num}>
                    {num === 0 ? 'Minggu Ini' : num === 1 ? 'Minggu Lalu' : `${num} Minggu Lalu`} 
                    ({format(start, 'dd MMM')} - {format(end, 'dd MMM')})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="bg-stone-100 p-4 border-l-2 border-[#F27D26] text-[10px] uppercase tracking-widest font-bold text-gray-500 space-y-2 dark:bg-[#090A0C] dark:text-[#8E9299]">
            <p className="text-gray-900 dark:text-[#E0E2E6]">Isi Laporan:</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Berisi <strong>Ringkasan</strong> pendapatan toko.</li>
              <li>Berisi <strong>Penjualan Toko</strong>, pengiriman, dan catatan tempo.</li>
              <li>Berisi <strong>Stok Inventaris</strong> saat ini.</li>
            </ul>
          </div>

          <button 
            onClick={generateReport}
            className="w-full bg-[#F27D26] hover:brightness-110 text-black py-4 px-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} />
            Unduh Laporan Toko
          </button>
        </div>
      </div>
    </div>
  );
};
