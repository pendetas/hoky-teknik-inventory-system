import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Edit2, Image as ImageIcon, ReceiptText } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, getShopeeReceivableAmount } from '../../lib/utils';
import { Product, ShopeeOrderStatus, ShopeeSale } from '../../lib/types';

type ShopeeSalesTableProps = {
  paginatedShopeeSales: ShopeeSale[];
  filteredShopeeSalesLength: number;
  pageSize: number;
  firstVisibleIndex: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  hasActiveFilter: string | boolean;
  openStatusMenuId: string | null;
  setOpenStatusMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  statusOptions: ShopeeOrderStatus[];
  getProduct: (id: string) => Product | undefined;
  getProductName: (id: string) => string;
  formatOrderTime: (value: string) => string;
  getStatusBadgeClass: (status: ShopeeOrderStatus) => string;
  getStatusLabel: (status: ShopeeOrderStatus) => string;
  getPaymentLabel: (method: ShopeeSale['purchaseMethod']) => string;
  handleStatusChange: (sale: ShopeeSale, status: ShopeeOrderStatus) => void;
  handleOpenInvoiceModal: (sale: ShopeeSale) => void;
  handleOpenEditModal: (sale: ShopeeSale) => void;
};

export const ShopeeSalesTable = ({
  paginatedShopeeSales,
  filteredShopeeSalesLength,
  pageSize,
  firstVisibleIndex,
  totalPages,
  currentPage,
  setCurrentPage,
  hasActiveFilter,
  openStatusMenuId,
  setOpenStatusMenuId,
  statusOptions,
  getProduct,
  getProductName,
  formatOrderTime,
  getStatusBadgeClass,
  getStatusLabel,
  getPaymentLabel,
  handleStatusChange,
  handleOpenInvoiceModal,
  handleOpenEditModal,
}: ShopeeSalesTableProps) => (
  <div className="bg-stone-50 border border-gray-200 overflow-hidden shadow-sm dark:bg-[#111] dark:border-[#333]">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-[0.5px] border-gray-200 text-[9px] uppercase tracking-[0.08em] font-bold text-gray-900 dark:border-[#1E1E1E] dark:text-[#E0E0E0]">
            <th className="px-3 py-2.5">Order ID</th>
            <th className="px-3 py-2.5">No. Resi</th>
            <th className="px-3 py-2.5">Tanggal</th>
            <th className="px-3 py-2.5">Produk</th>
            <th className="px-3 py-2.5">Quantity</th>
            <th className="px-3 py-2.5">Penerimaan Shopee</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Metode Pengiriman</th>
            <th className="px-3 py-2.5">Jenis Pembayaran</th>
            <th className="px-3 py-2.5">Catatan</th>
            <th className="px-3 py-2.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y-[0.5px] divide-gray-200 dark:divide-[#1E1E1E]">
          {paginatedShopeeSales.map((sale) => {
            const hasMultipleItems = sale.items.length > 1;

            return (
              <motion.tr
                key={sale.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ boxShadow: 'inset 3px 0 0 #F97316' }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className={`relative transition-colors hover:bg-gray-100 dark:bg-[#111] dark:hover:bg-[#161616] ${openStatusMenuId === sale.id ? 'z-20' : 'z-0'}`}
              >
                <td className="px-3 py-2 align-middle text-xs font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">{sale.orderId || '-'}</td>
                <td className="px-3 py-2 align-middle text-xs font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">
                  {sale.deliveryId || <span>&mdash;</span>}
                </td>
                <td className="px-3 py-2 align-middle text-xs font-mono text-gray-900 dark:text-[#E0E0E0]">
                  <div className="flex flex-col gap-1">
                    <span>{new Date(sale.date).toLocaleDateString()}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                      {formatOrderTime(sale.createdAt)} WIB
                    </span>
                  </div>
                </td>
                <td className={`px-3 py-2 text-xs font-semibold ${hasMultipleItems ? 'align-top' : 'align-middle'}`}>
                  <div className="space-y-2">
                    {sale.items.map((item) => (
                      <div key={item.id} className="flex min-h-8 items-center gap-2 text-gray-900 dark:text-[#E0E0E0]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border-[0.5px] border-gray-300 bg-gray-100 text-gray-400 dark:border-[#333] dark:bg-[#0B0B0B] dark:text-[#555]">
                          {getProduct(item.productId)?.photoUrl ? (
                            <img
                              src={getProduct(item.productId)?.photoUrl}
                              alt={getProductName(item.productId)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                        </div>
                        <span>{getProductName(item.productId)}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className={`px-3 py-2 text-xs font-mono text-gray-900 dark:text-[#E0E0E0] ${hasMultipleItems ? 'align-top' : 'align-middle'}`}>
                  <div className="space-y-2">
                    {sale.items.map((item) => (
                      <div key={item.id} className="flex min-h-8 items-center">{item.quantity}</div>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 align-middle text-xs font-bold font-mono text-gray-950 dark:text-white">
                  {sale.status === 'Cancelled'
                    ? 'Dibatalkan'
                    : sale.status === 'Shipped' || sale.status === 'Postponed'
                      ? `Estimasi: ${formatCurrency(sale.price)}`
                      : `${sale.finalReceiptAmount === null ? 'Estimasi: ' : 'Final: '}${formatCurrency(getShopeeReceivableAmount(sale))}`}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setOpenStatusMenuId((current) => current === sale.id ? null : sale.id)}
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] uppercase font-black tracking-widest ${getStatusBadgeClass(sale.status)}`}
                    >
                      {getStatusLabel(sale.status)}
                      <ChevronDown size={12} />
                    </button>

                    {openStatusMenuId === sale.id && (
                      <div className="absolute left-0 top-7 z-50 w-28 border-[0.5px] border-[#333] bg-[#111] py-1 shadow-xl">
                        {statusOptions.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleStatusChange(sale, status)}
                            className={`block w-full px-2.5 py-1.5 text-left text-[9px] font-black uppercase tracking-widest transition-colors hover:bg-[#161616] ${getStatusBadgeClass(status)}`}
                          >
                            {getStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 align-middle text-[11px] font-semibold text-gray-900 dark:text-[#E0E0E0]">
                  {sale.deliveryMethod}
                </td>
                <td className="px-3 py-2 align-middle text-[11px] font-semibold text-gray-900 dark:text-[#E0E0E0]">
                  {getPaymentLabel(sale.purchaseMethod)}
                </td>
                <td className="max-w-44 px-3 py-2 align-middle text-[11px] font-medium text-gray-600 dark:text-[#A0A0A0]">
                  <span className="line-clamp-3" title={sale.note || undefined}>
                    {sale.note || <span>&mdash;</span>}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleOpenInvoiceModal(sale)}
                      className="flex h-7 w-7 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:border-[#F27D26] hover:text-[#F27D26] dark:border-[#333] dark:text-[#888] dark:hover:border-[#F27D26] dark:hover:text-[#F27D26]"
                      title="Cetak invoice"
                    >
                      <ReceiptText size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(sale)}
                      className="flex h-7 w-7 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-800 dark:border-[#333] dark:text-[#888] dark:hover:border-[#555] dark:hover:text-[#E0E0E0]"
                      title="Edit data"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
          {filteredShopeeSalesLength === 0 && (
            <tr>
              <td colSpan={11} className="p-6 text-center text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                {hasActiveFilter ? 'Tidak ada data Shopee yang cocok dengan filter.' : 'Tidak ada data Shopee ditemukan.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {filteredShopeeSalesLength > pageSize && (
      <div className="flex flex-col gap-2 border-t border-gray-200 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:border-[#1E1E1E] dark:text-[#8E9299] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {firstVisibleIndex + 1}-{Math.min(firstVisibleIndex + pageSize, filteredShopeeSalesLength)} dari {filteredShopeeSalesLength} kiriman
        </span>
        <div className="flex items-center gap-2">
          <span>Halaman {currentPage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="flex h-7 w-7 items-center justify-center border border-gray-300 text-gray-700 transition-colors hover:border-[#F97316] hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:border-[#F97316] dark:hover:text-[#F97316]"
            title="Halaman sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="flex h-7 w-7 items-center justify-center border border-gray-300 text-gray-700 transition-colors hover:border-[#F97316] hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:border-[#F97316] dark:hover:text-[#F97316]"
            title="Halaman berikutnya"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )}
  </div>
);
