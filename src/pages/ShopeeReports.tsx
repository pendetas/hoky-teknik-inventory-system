import React, { useMemo, useState } from 'react';
import { CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';
import { endOfMonth, endOfWeek, format, isWithinInterval, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import * as XLSX from 'xlsx';
import { useInventory } from '../store/InventoryContext';
import { formatCurrency, getShopeeReceivableAmount } from '../lib/utils';
import { ShopeeOrderStatus, ShopeeReturnStatus } from '../lib/types';
import { buildTopProductBarRows } from '../lib/reportUtils';

type ReportMode = 'weekly' | 'monthly' | 'custom';

const getStatusLabel = (status: ShopeeOrderStatus) => {
  if (status === 'Shipped') return 'Dikirim';
  if (status === 'Delivered') return 'Diterima';
  return 'Diretur';
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);

export const ShopeeReports = () => {
  const { products, shopeeSales, shopeeReturnCases } = useInventory();
  const [reportMode, setReportMode] = useState<ReportMode>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const period = useMemo(() => {
    if (reportMode === 'monthly') {
      const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, 'MMMM yyyy'),
      };
    }

    if (reportMode === 'custom' && customStartDate && customEndDate) {
      const start = toDate(customStartDate);
      const end = new Date(`${customEndDate}T23:59:59`);
      return {
        start,
        end,
        label: `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`,
      };
    }

    const targetDate = subWeeks(new Date(), selectedWeek);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });
    return {
      start,
      end,
      label: `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`,
    };
  }, [customEndDate, customStartDate, reportMode, selectedMonth, selectedWeek]);

  const getProductName = (id: string) => {
    return products.find((product) => product.id === id)?.name || 'Tidak diketahui';
  };

  const getOrderProducts = (items: typeof shopeeSales[number]['items']) => {
    return items.map((item) => `${getProductName(item.productId)} x${item.quantity}`).join(', ');
  };

  const getOrderQty = (items: typeof shopeeSales[number]['items']) => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getReturnCountByStatus = (status: ShopeeReturnStatus, returns: typeof shopeeReturnCases) => {
    return returns.filter((returnCase) => returnCase.returnStatus === status).length;
  };

  const generateShopeeReport = () => {
    const filteredShipments = shopeeSales.filter((sale) => (
      isWithinInterval(toDate(sale.date), { start: period.start, end: period.end })
    ));
    const filteredReturns = shopeeReturnCases.filter((returnCase) => (
      isWithinInterval(new Date(returnCase.updatedAt), { start: period.start, end: period.end })
    ));

    const shipmentRevenue = filteredShipments.reduce((total, sale) => total + getShopeeReceivableAmount(sale), 0);
    const compensationRevenue = filteredReturns.reduce((total, returnCase) => {
      if (returnCase.returnStatus !== 'Barang Rusak - Dikompensasi') return total;
      return total + returnCase.compensationAmount;
    }, 0);
    const totalOmset = shipmentRevenue + compensationRevenue;
    const shipmentQty = filteredShipments.reduce((total, sale) => total + getOrderQty(sale.items), 0);
    const returnedQty = filteredReturns.reduce((total, returnCase) => total + getOrderQty(returnCase.order.items), 0);
    const shippedCount = filteredShipments.filter((sale) => sale.status === 'Shipped').length;
    const deliveredCount = filteredShipments.filter((sale) => sale.status === 'Delivered').length;
    const returnedOrderCount = filteredShipments.filter((sale) => sale.status === 'Returned').length;
    const topSellableRows = buildTopProductBarRows(
      filteredShipments
        .filter((sale) => sale.status !== 'Returned')
        .flatMap((sale) => sale.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))),
      getProductName
    );

    const summaryData = [
      ['LAPORAN SHOPEE HOKY TEKNIK'],
      ['Periode', period.label],
      ['Jenis Laporan', reportMode === 'weekly' ? 'Mingguan' : reportMode === 'monthly' ? 'Bulanan' : 'Rentang Tanggal'],
      [],
      ['STATUS ORDER SHOPEE', 'NILAI'],
      ['Total Order Shopee', filteredShipments.length],
      ['Order Masih Dikirim', shippedCount],
      ['Order Diterima', deliveredCount],
      ['Order Masuk Retur', returnedOrderCount],
      ['Total Quantity Order', shipmentQty],
      [],
      ['PENGEMBALIAN SHOPEE', 'NILAI'],
      ['Kasus Retur Dibuka', filteredReturns.length],
      ['Total Quantity Retur', returnedQty],
      ['Retur Barang Bagus', getReturnCountByStatus('Barang Bagus', filteredReturns)],
      ['Retur Rusak Menunggu Shopee', getReturnCountByStatus('Barang Rusak - Menunggu Shopee', filteredReturns)],
      ['Retur Rusak Dikompensasi', getReturnCountByStatus('Barang Rusak - Dikompensasi', filteredReturns)],
      ['Retur Rusak Ditolak', getReturnCountByStatus('Barang Rusak - Ditolak', filteredReturns)],
      [],
      ['OMSET SHOPEE', 'NILAI'],
      ['Omset Order Diterima', shipmentRevenue],
      ['Kompensasi Retur Shopee', compensationRevenue],
      ['TOTAL OMSET SHOPEE', totalOmset],
      [],
      ['PRODUK TERLARIS', 'QTY TERJUAL', 'BAR CHART'],
      ['Berdasarkan order Shopee berstatus Dikirim/Diterima'],
      ['Rank', 'Nama Produk', 'Quantity', 'Bar Chart'],
      ...topSellableRows,
    ];

    const shipmentData = [
      ['ID Pesanan', 'No. Resi', 'Tanggal', 'Status', 'Metode Pengiriman', 'Metode Pembayaran', 'Catatan', 'Produk', 'Total Qty', 'Estimasi Penerimaan', 'Penerimaan Final', 'Omset Diakui'],
      ...filteredShipments.map((sale) => [
        sale.orderId || '-',
        sale.deliveryId || '-',
        format(toDate(sale.date), 'yyyy-MM-dd'),
        getStatusLabel(sale.status),
        sale.deliveryMethod,
        sale.purchaseMethod,
        sale.note || '-',
        getOrderProducts(sale.items),
        getOrderQty(sale.items),
        sale.price,
        sale.finalReceiptAmount ?? '-',
        getShopeeReceivableAmount(sale),
      ]),
    ];

    const returnData = [
      ['ID Pesanan', 'No. Resi', 'Tanggal Order', 'Tanggal Update Return', 'Status Pengembalian', 'Produk', 'Total Qty', 'Kompensasi', 'Catatan'],
      ...filteredReturns.map((returnCase) => [
        returnCase.order.orderId || '-',
        returnCase.order.deliveryId || '-',
        format(toDate(returnCase.order.date), 'yyyy-MM-dd'),
        format(new Date(returnCase.updatedAt), 'yyyy-MM-dd HH:mm'),
        returnCase.returnStatus,
        getOrderProducts(returnCase.order.items),
        getOrderQty(returnCase.order.items),
        returnCase.compensationAmount,
        returnCase.note || '-',
      ]),
    ];

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 14 },
      { wch: 28 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(shipmentData), 'Pengiriman Shopee');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(returnData), 'Pengembalian Shopee');

    XLSX.writeFile(workbook, `Laporan_Shopee_${format(period.start, 'yyyy-MM-dd')}_${format(period.end, 'yyyy-MM-dd')}.xlsx`);
  };

  const currentPeriodShipments = shopeeSales.filter((sale) => (
    isWithinInterval(toDate(sale.date), { start: period.start, end: period.end })
  ));
  const currentPeriodReturns = shopeeReturnCases.filter((returnCase) => (
    isWithinInterval(new Date(returnCase.updatedAt), { start: period.start, end: period.end })
  ));
  const currentOmset = currentPeriodShipments.reduce((total, sale) => total + getShopeeReceivableAmount(sale), 0)
    + currentPeriodReturns.reduce((total, returnCase) => total + (
      returnCase.returnStatus === 'Barang Rusak - Dikompensasi' ? returnCase.compensationAmount : 0
    ), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-stone-50 p-6 border border-gray-200 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gray-200 text-[#F27D26] flex items-center justify-center dark:bg-[#333]">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase italic text-gray-900 mb-1 dark:text-[#E0E2E6]">Laporan Shopee</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Download pengiriman dan pengembalian Shopee dalam satu Excel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 border border-gray-200 dark:bg-[#111] dark:border-[#333]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Pengiriman</span>
            <div className="mt-2 text-2xl font-black font-mono text-gray-900 dark:text-[#E0E0E0]">{currentPeriodShipments.length}</div>
          </div>
          <div className="bg-white p-4 border border-gray-200 dark:bg-[#111] dark:border-[#333]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Pengembalian</span>
            <div className="mt-2 text-2xl font-black font-mono text-gray-900 dark:text-[#E0E0E0]">{currentPeriodReturns.length}</div>
          </div>
          <div className="bg-white p-4 border border-gray-200 dark:bg-[#111] dark:border-[#333]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Total Omset</span>
            <div className="mt-2 text-2xl font-black font-mono text-gray-900 dark:text-[#E0E0E0]">{formatCurrency(currentOmset)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 border border-gray-200 dark:bg-[#111] dark:border-[#333]">
            <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-3 flex items-center gap-2 dark:text-[#8E9299]">
              <CalendarIcon size={14} className="text-[#F27D26]" /> Periode Laporan
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={reportMode}
                onChange={(event) => setReportMode(event.target.value as ReportMode)}
                className="h-11 bg-stone-50 border border-gray-300 px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333] dark:text-[#E0E0E0]"
              >
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="custom">Rentang Tanggal</option>
              </select>

              {reportMode === 'weekly' && (
                <select
                  value={selectedWeek}
                  onChange={(event) => setSelectedWeek(Number(event.target.value))}
                  className="h-11 bg-stone-50 border border-gray-300 px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333] dark:text-[#E0E0E0] md:col-span-2"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((weekOffset) => {
                    const target = subWeeks(new Date(), weekOffset);
                    const start = startOfWeek(target, { weekStartsOn: 1 });
                    const end = endOfWeek(target, { weekStartsOn: 1 });
                    return (
                      <option key={weekOffset} value={weekOffset}>
                        {weekOffset === 0 ? 'Minggu Ini' : weekOffset === 1 ? 'Minggu Lalu' : `${weekOffset} Minggu Lalu`} ({format(start, 'dd MMM')} - {format(end, 'dd MMM')})
                      </option>
                    );
                  })}
                </select>
              )}

              {reportMode === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="h-11 bg-stone-50 border border-gray-300 px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333] dark:text-[#E0E0E0] md:col-span-2"
                />
              )}

              {reportMode === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-11 bg-stone-50 border border-gray-300 px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333] dark:text-[#E0E0E0]"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-11 bg-stone-50 border border-gray-300 px-3 text-sm font-bold text-gray-900 outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333] dark:text-[#E0E0E0]"
                  />
                </>
              )}
            </div>
          </div>

          <div className="bg-stone-100 p-4 border-l-2 border-[#F27D26] text-[10px] uppercase tracking-widest font-bold text-gray-500 space-y-2 dark:bg-[#090A0C] dark:text-[#8E9299]">
            <p className="text-gray-900 dark:text-[#E0E2E6]">Isi Excel:</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Ringkasan status order, status retur, dan total omset Shopee.</li>
              <li>Detail Pengiriman Shopee sesuai data halaman pengiriman.</li>
              <li>Detail Pengembalian Shopee sesuai status return dan kompensasi.</li>
            </ul>
          </div>

          <button
            onClick={generateShopeeReport}
            disabled={reportMode === 'custom' && (!customStartDate || !customEndDate)}
            className="w-full bg-[#F27D26] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-black py-4 px-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} />
            Unduh Laporan Shopee
          </button>
        </div>
      </div>
    </div>
  );
};
