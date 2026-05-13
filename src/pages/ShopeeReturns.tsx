import React, { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Image as ImageIcon, Search } from 'lucide-react';
import { useInventory } from '../store/InventoryContext';
import { formatCurrency } from '../lib/utils';
import { ShopeeReturnCase, ShopeeReturnStatus } from '../lib/types';

const returnStatusOptions: ShopeeReturnStatus[] = [
  'Menunggu Cek',
  'Barang Bagus',
  'Barang Rusak - Menunggu Shopee',
  'Barang Rusak - Dikompensasi',
  'Barang Rusak - Ditolak',
];

export const ShopeeReturns = () => {
  const { products, shopeeReturnCases, updateShopeeReturnCase } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getProduct = (id: string) => {
    return products.find((product) => product.id === id);
  };

  const getProductName = (id: string) => {
    return getProduct(id)?.name || 'Produk terhapus';
  };

  const getPaymentLabel = (method: ShopeeReturnCase['order']['purchaseMethod']) => {
    if (method === 'Online Payment') return 'Pembayaran Online';
    if (method === 'COD') return 'COD';
    return 'Shopee Pay Later';
  };

  const handleReturnStatusChange = async (returnCase: ShopeeReturnCase, nextStatus: ShopeeReturnStatus) => {
    const nextCompensation = nextStatus === 'Barang Rusak - Dikompensasi'
      ? returnCase.compensationAmount
      : 0;

    try {
      await updateShopeeReturnCase(returnCase.id, nextStatus, nextCompensation, returnCase.note);
    } catch (err) {
      alert(`Gagal mengubah status pengembalian: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    }
  };

  const handleCompensationSave = async (returnCase: ShopeeReturnCase, value: string) => {
    if (returnCase.returnStatus !== 'Barang Rusak - Dikompensasi') return;

    const nextAmount = Math.max(0, Number(value) || 0);
    if (nextAmount === returnCase.compensationAmount) return;

    try {
      await updateShopeeReturnCase(returnCase.id, returnCase.returnStatus, nextAmount, returnCase.note);
    } catch (err) {
      alert(`Gagal menyimpan kompensasi: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    }
  };

  const filteredReturnCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return shopeeReturnCases
      .filter((returnCase) => {
        const order = returnCase.order;
        const matchesDateFrom = !startDate || order.date >= startDate;
        const matchesDateTo = !endDate || order.date <= endDate;
        if (!matchesDateFrom || !matchesDateTo) return false;

        if (!normalizedSearch) return true;

        const productNames = order.items
          .map((item) => getProductName(item.productId))
          .join(' ')
          .toLowerCase();

        return [
          order.orderId,
          order.deliveryId,
          order.date,
          returnCase.returnStatus,
          order.deliveryMethod,
          getPaymentLabel(order.purchaseMethod),
          productNames,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [endDate, products, searchTerm, shopeeReturnCases, startDate]);

  const hasActiveFilter = searchTerm || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="space-y-5">
          <div className="flex flex-col gap-1 border-b border-gray-200 pb-4 dark:border-[#2A2D35]">
            <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">Filter Pengembalian Shopee</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
              {filteredReturnCases.length} dari {shopeeReturnCases.length} data ditampilkan
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Cari</span>
              <div className="mt-1 flex h-10 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
                <Search size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order ID, produk, resi..."
                  className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#A0A0A0] dark:placeholder:text-[#555]"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Dari Tanggal</span>
              <div className="mt-1 flex h-10 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
                <Calendar size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none dark:text-[#A0A0A0]"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Sampai Tanggal</span>
              <div className="mt-1 flex h-10 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
                <Calendar size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none dark:text-[#A0A0A0]"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
              disabled={!hasActiveFilter}
              className="h-10 self-end border-[0.5px] border-[#F97316] bg-transparent px-4 text-[10px] font-black uppercase tracking-tighter text-[#F97316] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[rgba(249,115,22,0.08)]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-stone-50 border border-gray-200 overflow-hidden shadow-sm dark:bg-[#111] dark:border-[#333]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-gray-200 text-[10px] uppercase tracking-[0.08em] font-bold text-gray-900 dark:border-[#1E1E1E] dark:text-[#E0E0E0]">
                <th className="p-4">Order ID</th>
                <th className="p-4">No. Resi</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Produk Diretur</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Status Pengembalian</th>
                <th className="p-4">Kompensasi</th>
                <th className="p-4">Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-gray-200 dark:divide-[#1E1E1E]">
              {filteredReturnCases.map((returnCase) => (
                <tr key={returnCase.id} className="transition-colors hover:bg-gray-100 dark:bg-[#111] dark:hover:bg-[#161616]">
                  <td className="p-4 text-sm font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">{returnCase.order.orderId}</td>
                  <td className={`p-4 text-sm font-mono ${returnCase.order.deliveryId ? 'font-bold text-gray-900 dark:text-[#E0E0E0]' : 'text-gray-300 dark:text-[#3A3A3A]'}`}>
                    {returnCase.order.deliveryId || <span>&mdash;</span>}
                  </td>
                  <td className="p-4 text-sm font-mono text-gray-700 dark:text-[#D0D0D0]">
                    {new Date(returnCase.order.date).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm font-semibold">
                    <div className="space-y-3">
                      {returnCase.order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-gray-900 dark:text-[#E0E0E0]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-[0.5px] border-gray-300 bg-gray-100 text-gray-400 dark:border-[#333] dark:bg-[#0B0B0B] dark:text-[#555]">
                            {getProduct(item.productId)?.photoUrl ? (
                              <img
                                src={getProduct(item.productId)?.photoUrl}
                                alt={getProductName(item.productId)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={16} />
                            )}
                          </div>
                          <span>{getProductName(item.productId)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-gray-700 dark:text-[#D0D0D0]">
                    <div className="space-y-1">
                      {returnCase.order.items.map((item) => (
                        <div key={item.id}>{item.quantity}</div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <select
                        value={returnCase.returnStatus}
                        onChange={(event) => handleReturnStatusChange(returnCase, event.target.value as ShopeeReturnStatus)}
                        className="h-9 w-64 appearance-none border-[0.5px] border-gray-300 bg-white px-3 pr-8 text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#D0D0D0]"
                      >
                        {returnStatusOptions.map((status) => (
                          <option key={status} value={status} className="bg-white text-gray-700 dark:bg-[#111] dark:text-[#D0D0D0]">{status}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-[#8E9299]" />
                    </div>
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="0"
                      defaultValue={returnCase.compensationAmount}
                      disabled={returnCase.returnStatus !== 'Barang Rusak - Dikompensasi'}
                      onBlur={(event) => handleCompensationSave(returnCase, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                      className="h-9 w-32 border-[0.5px] border-gray-300 bg-white px-3 text-sm font-mono font-bold text-gray-900 outline-none transition-colors focus:border-[#F97316] disabled:opacity-30 dark:border-[#333] dark:bg-[#111] dark:text-[#D0D0D0]"
                    />
                  </td>
                  <td className="p-4 text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#888]">
                    {getPaymentLabel(returnCase.order.purchaseMethod)}
                  </td>
                </tr>
              ))}
              {filteredReturnCases.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                    {hasActiveFilter ? 'Tidak ada pengembalian Shopee yang cocok dengan filter.' : 'Belum ada order Shopee berstatus diretur.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
