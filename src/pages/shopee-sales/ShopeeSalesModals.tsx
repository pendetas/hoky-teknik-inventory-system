import React, { useMemo, useState } from 'react';
import { ChevronDown, Printer, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatCurrency, formatRupiahInput } from '../../lib/utils';
import { Product, ShopeeDeliveryMethod, ShopeeOrderStatus, ShopeePurchaseMethod, ShopeeSale } from '../../lib/types';

export type ShopeeSaleFormData = {
  orderId: string;
  deliveryId: string;
  price: string;
  deliveryMethod: ShopeeDeliveryMethod;
  purchaseMethod: ShopeePurchaseMethod;
  note: string;
  status: ShopeeOrderStatus;
  date: string;
  finalReceiptAmount: number | null;
};

export type ShopeeSaleFormItem = {
  productId: string;
  quantity: string;
};

export type ShopeeInvoiceDraft = {
  sale: ShopeeSale;
  buyerName: string;
  invoiceNo: string;
};

export type ShopeeDeliveryConfirmation = {
  sale: ShopeeSale;
  finalPrice: string;
  isDifferent: boolean;
};

type ProductPickerProps = {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
};

const getProductBrand = (productName: string) => productName.trim().split(/\s+/)[0]?.toUpperCase() || 'LAINNYA';

const ProductPicker = ({ products, selectedProductId, onSelect }: ProductPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const normalizedQuery = query.trim().toLowerCase();

  const groupedProducts = useMemo(() => {
    const filteredProducts = products
      .filter((product) => {
        if (!normalizedQuery) return true;
        return [
          product.name,
          product.description,
          getProductBrand(product.name),
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => getProductBrand(a.name).localeCompare(getProductBrand(b.name)) || a.name.localeCompare(b.name));

    return filteredProducts.reduce<Array<{ brand: string; products: Product[] }>>((groups, product) => {
      const brand = getProductBrand(product.name);
      const currentGroup = groups[groups.length - 1];

      if (currentGroup?.brand === brand) {
        currentGroup.products.push(product);
      } else {
        groups.push({ brand, products: [product] });
      }

      return groups;
    }, []);
  }, [normalizedQuery, products]);

  return (
    <div
      className={`relative ${isOpen ? 'z-50' : 'z-0'}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
          setQuery('');
        }
      }}
    >
      <div className="flex h-10 items-center gap-2 border border-gray-300 bg-white px-2 transition-colors focus-within:border-[#F27D26] dark:border-[#333740] dark:bg-[#1A1C21]">
        <Search size={14} className="shrink-0 text-gray-500 dark:text-[#8E9299]" />
        <input
          type="text"
          value={isOpen ? query : selectedProduct?.name || ''}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder={selectedProduct ? selectedProduct.name : 'Cari produk / brand...'}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-[#555]"
        />
        <ChevronDown size={15} className="shrink-0 text-gray-500 dark:text-[#8E9299]" />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[44px] max-h-72 overflow-auto border border-[#F27D26] bg-white shadow-xl dark:bg-[#111]">
          {groupedProducts.length > 0 ? (
            groupedProducts.map((group) => (
              <div key={group.brand}>
                <div className="sticky top-0 bg-gray-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:bg-[#1A1C21] dark:text-[#8E9299]">
                  {group.brand}
                </div>
                {group.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelect(product.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-orange-50 dark:hover:bg-[#1A1C21] ${
                      selectedProductId === product.id ? 'bg-orange-50 text-[#F27D26] dark:bg-[rgba(249,115,22,0.12)]' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className="min-w-0 truncate">{product.name}</span>
                    <span className={`shrink-0 font-mono text-[10px] ${product.stock <= 0 ? 'text-[#EF4444]' : 'text-gray-500 dark:text-[#8E9299]'}`}>
                      Stok: {product.stock}
                    </span>
                  </button>
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
              Produk tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ShopeeSalesModalsProps = {
  products: Product[];
  isModalOpen: boolean;
  editingSaleId: string | null;
  formData: ShopeeSaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShopeeSaleFormData>>;
  items: ShopeeSaleFormItem[];
  formValidationError: string;
  setFormValidationError: React.Dispatch<React.SetStateAction<string>>;
  itemValidationError: string;
  isSaving: boolean;
  isDeleting: boolean;
  handleCloseModal: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleAddItem: () => void;
  handleItemChange: (index: number, field: 'productId' | 'quantity', value: string) => void;
  handleRemoveItem: (index: number) => void;
  handlePriceChange: (value: string) => void;
  handlePriceKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleDeleteShopeeSale: () => void;
  invoiceDraft: ShopeeInvoiceDraft | null;
  setInvoiceDraft: React.Dispatch<React.SetStateAction<ShopeeInvoiceDraft | null>>;
  handlePrintInvoice: () => void;
  getInvoiceAmount: (sale: ShopeeSale) => number;
  getInvoiceLineAmount: (sale: ShopeeSale, quantity: number) => number;
  getProductName: (id: string) => string;
  deliveryConfirmation: ShopeeDeliveryConfirmation | null;
  setDeliveryConfirmation: React.Dispatch<React.SetStateAction<ShopeeDeliveryConfirmation | null>>;
  handleFinalPriceChange: (value: string) => void;
  handleFinalPriceKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleConfirmDelivered: () => void;
};

export const ShopeeSalesModals = ({
  products,
  isModalOpen,
  editingSaleId,
  formData,
  setFormData,
  items,
  formValidationError,
  setFormValidationError,
  itemValidationError,
  isSaving,
  isDeleting,
  handleCloseModal,
  handleSubmit,
  handleAddItem,
  handleItemChange,
  handleRemoveItem,
  handlePriceChange,
  handlePriceKeyDown,
  handleDeleteShopeeSale,
  invoiceDraft,
  setInvoiceDraft,
  handlePrintInvoice,
  getInvoiceAmount,
  getInvoiceLineAmount,
  getProductName,
  deliveryConfirmation,
  setDeliveryConfirmation,
  handleFinalPriceChange,
  handleFinalPriceKeyDown,
  handleConfirmDelivered,
}: ShopeeSalesModalsProps) => (
  <>
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border border-gray-200 bg-stone-50 text-gray-900 shadow-xl dark:border-[#2A2D35] dark:bg-[#151619] dark:text-[#E0E2E6]"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center dark:border-[#2A2D35]">
              <h3 className="text-sm font-bold uppercase italic">{editingSaleId ? 'Edit Data Shopee' : 'Input Shopee Baru'}</h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">ID Pesanan <span className="text-[#F27D26]">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="contoh: 231124XXX"
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.orderId}
                    onChange={(e) => {
                      setFormValidationError('');
                      setFormData({ ...formData, orderId: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Tanggal</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-gray-500 block tracking-widest dark:text-[#8E9299]">Produk dalam Order</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[10px] font-black uppercase tracking-tighter text-[#F27D26] hover:brightness-110"
                  >
                    + Tambah Produk
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_96px_32px] gap-2">
                    <ProductPicker
                      products={products}
                      selectedProductId={item.productId}
                      onSelect={(productId) => handleItemChange(index, 'productId', productId)}
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      className="flex items-center justify-center text-[#FF4444] disabled:opacity-30"
                      title="Hapus produk"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {itemValidationError && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF4444]">
                    {itemValidationError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">No. Resi</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: SPXID123456789"
                  className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                  value={formData.deliveryId}
                  onChange={(e) => {
                    setFormValidationError('');
                    setFormData({ ...formData, deliveryId: e.target.value });
                  }}
                />
                {formValidationError && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#FF4444]">
                    {formValidationError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Harga Estimasi Penerimaan</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                  value={formatRupiahInput(formData.price)}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="Rp 0,00"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Status</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-gray-300 p-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ShopeeOrderStatus })}
                  >
                    <option value="Shipped">Dikirim</option>
                    <option value="Delivered">Diterima</option>
                    <option value="Returned">Retur</option>
                    <option value="Postponed">Ditunda</option>
                    <option value="Cancelled">Dibatal</option>
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#8E9299]" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Metode Pengiriman</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-gray-300 p-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.deliveryMethod}
                    onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value as ShopeeDeliveryMethod })}
                  >
                    <option value="Shopee Xpress">Shopee Xpress</option>
                    <option value="Shopee Xpress Instant">Shopee Xpress Instant</option>
                    <option value="J&T Express">J&T Express</option>
                    <option value="JNE">JNE</option>
                    <option value="SiCepat">SiCepat</option>
                    <option value="Anteraja">Anteraja</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#8E9299]" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Metode Pembayaran</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-gray-300 p-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.purchaseMethod}
                    onChange={(e) => setFormData({ ...formData, purchaseMethod: e.target.value as ShopeePurchaseMethod })}
                  >
                    <option value="Online Payment">Pembayaran Online</option>
                    <option value="COD">Bayar di Tempat (COD)</option>
                    <option value="Shopee Pay Later">Shopee Pay Later</option>
                    <option value="Instant">Instant</option>
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#8E9299]" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Note</label>
                <textarea
                  className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Catatan tambahan untuk pengiriman Shopee"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {editingSaleId ? (
                  <button
                    type="button"
                    onClick={handleDeleteShopeeSale}
                    disabled={isDeleting || isSaving}
                    className="flex items-center justify-center gap-2 border border-[#EF4444] px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-[#EF4444] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[rgba(239,68,68,0.08)]"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Menghapus...' : 'Hapus Data'}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isDeleting}
                    className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-gray-700 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:text-white dark:hover:bg-[#333740]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isDeleting}
                    className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-black bg-[#F27D26] hover:brightness-110 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? 'Menyimpan...' : editingSaleId ? 'Simpan Perubahan' : 'Simpan Data'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {invoiceDraft && (
        <div className="invoice-modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-gray-200 bg-stone-50 text-gray-900 shadow-xl dark:border-[#2A2D35] dark:bg-[#151619] dark:text-[#E0E2E6] lg:flex-row"
          >
            <div className="invoice-form w-full border-b border-gray-200 p-6 dark:border-[#2A2D35] lg:w-[360px] lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase italic">Cetak Invoice Shopee</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">Preview A6 untuk PDF / print</p>
                </div>
                <button onClick={() => setInvoiceDraft(null)} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Nama Pembeli <span className="text-[#F27D26]">*</span></span>
                  <input
                    type="text"
                    value={invoiceDraft.buyerName}
                    onChange={(event) => setInvoiceDraft((prev) => prev ? { ...prev, buyerName: event.target.value } : prev)}
                    placeholder="Nama pembeli"
                    className="mt-1 w-full border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#F27D26] dark:border-[#333740] dark:bg-[#1A1C21] dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Nota No.</span>
                  <input
                    type="text"
                    value={invoiceDraft.invoiceNo}
                    onChange={(event) => setInvoiceDraft((prev) => prev ? { ...prev, invoiceNo: event.target.value } : prev)}
                    placeholder="Nomor nota"
                    className="mt-1 w-full border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#F27D26] dark:border-[#333740] dark:bg-[#1A1C21] dark:text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                  <div className="border border-gray-200 bg-white p-3 dark:border-[#333740] dark:bg-[#111]">
                    <span className="block">No. Resi</span>
                    <strong className="mt-1 block font-mono text-xs text-gray-900 dark:text-[#E0E2E6]">{invoiceDraft.sale.deliveryId || '-'}</strong>
                  </div>
                  <div className="border border-gray-200 bg-white p-3 dark:border-[#333740] dark:bg-[#111]">
                    <span className="block">Total</span>
                    <strong className="mt-1 block font-mono text-xs text-gray-900 dark:text-[#E0E2E6]">{formatCurrency(getInvoiceAmount(invoiceDraft.sale))}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  disabled={!invoiceDraft.buyerName.trim()}
                  className="flex w-full items-center justify-center gap-2 bg-[#F27D26] px-4 py-4 text-xs font-black uppercase tracking-widest text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer size={18} />
                  Print Invoice
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-200 p-6 dark:bg-[#0F1115]">
              <div className="invoice-print-area mx-auto">
                <section className="invoice-print-sheet bg-white text-black">
                  <header className="invoice-header">
                    <div>
                      <div className="invoice-brand">HOKY TEKNIK</div>
                    </div>
                    <div className="invoice-meta">
                      <div className="invoice-title">INVOICE</div>
                      <div className="invoice-meta-line">
                        <span>DATE</span>
                        <strong>{new Date(`${invoiceDraft.sale.date}T00:00:00`).toLocaleDateString('id-ID')}</strong>
                      </div>
                      <div className="invoice-meta-line">
                        <span>NOTA NO.</span>
                        <strong>{invoiceDraft.invoiceNo || '-'}</strong>
                      </div>
                      <div className="invoice-meta-line">
                        <span>TUAN / TOKO</span>
                        <strong>{invoiceDraft.buyerName || 'Nama pembeli'}</strong>
                      </div>
                    </div>
                  </header>

                  <div className="invoice-shipping-line">
                    <span>No. Resi: <strong>{invoiceDraft.sale.deliveryId || '-'}</strong></span>
                    <span>Pengiriman: <strong>{invoiceDraft.sale.deliveryMethod}</strong></span>
                  </div>

                  <table className="invoice-items">
                    <thead>
                      <tr>
                        <th>Banyaknya</th>
                        <th>Nama Barang</th>
                        <th>Harga</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDraft.sale.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.quantity} unit</td>
                          <td>{getProductName(item.productId)}</td>
                          <td>-</td>
                          <td>{formatCurrency(getInvoiceLineAmount(invoiceDraft.sale, item.quantity))}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 10 - invoiceDraft.sale.items.length) }).map((_, index) => (
                        <tr key={`blank-${index}`} className="invoice-blank-row">
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </tr>
                      ))}
                      <tr className="invoice-total-row">
                        <td colSpan={2}></td>
                        <td>Jumlah Rp.</td>
                        <td>{formatCurrency(getInvoiceAmount(invoiceDraft.sale))}</td>
                      </tr>
                    </tbody>
                  </table>

                  <footer className="invoice-footer">
                    <div>
                      <span>Tanda Terima</span>
                      <div className="invoice-signature-line" />
                    </div>
                    <div className="invoice-note">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</div>
                    <div>
                      <span>Hormat kami,</span>
                      <div className="invoice-signature-line" />
                    </div>
                  </footer>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {deliveryConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-stone-50 border border-gray-200 w-full max-w-md overflow-hidden text-gray-900 shadow-xl dark:bg-[#151619] dark:border-[#2A2D35] dark:text-[#E0E2E6]"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center dark:border-[#2A2D35]">
              <h3 className="text-sm font-bold uppercase italic">Konfirmasi Penerimaan Shopee</h3>
              <button onClick={() => setDeliveryConfirmation(null)} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Estimasi Harga Penerimaan</p>
                <div className="border border-gray-200 bg-white p-4 font-mono text-lg font-black text-gray-900 dark:border-[#333740] dark:bg-[#1A1C21] dark:text-white">
                  {formatCurrency(deliveryConfirmation.sale.price)}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Apakah harga final berbeda?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryConfirmation((prev) => prev ? { ...prev, isDifferent: false, finalPrice: String(prev.sale.price) } : prev)}
                    className={`border px-4 py-3 text-[10px] font-black uppercase tracking-tighter transition-colors ${!deliveryConfirmation.isDifferent ? 'border-[#F27D26] bg-orange-50 text-[#F27D26] dark:bg-[rgba(249,115,22,0.08)]' : 'border-gray-200 text-gray-600 dark:border-[#333740] dark:text-[#8E9299]'}`}
                  >
                    Sama
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryConfirmation((prev) => prev ? { ...prev, isDifferent: true } : prev)}
                    className={`border px-4 py-3 text-[10px] font-black uppercase tracking-tighter transition-colors ${deliveryConfirmation.isDifferent ? 'border-[#F27D26] bg-orange-50 text-[#F27D26] dark:bg-[rgba(249,115,22,0.08)]' : 'border-gray-200 text-gray-600 dark:border-[#333740] dark:text-[#8E9299]'}`}
                  >
                    Berbeda
                  </button>
                </div>
              </div>

              {deliveryConfirmation.isDifferent && (
                <label className="block">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Harga Penerimaan Final</span>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={formatRupiahInput(deliveryConfirmation.finalPrice)}
                    onChange={(event) => handleFinalPriceChange(event.target.value)}
                    onKeyDown={handleFinalPriceKeyDown}
                    placeholder="Rp 0,00"
                    className="mt-1 w-full bg-white border border-gray-300 p-3 text-sm font-mono text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                  />
                </label>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryConfirmation(null)}
                  className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-gray-700 hover:bg-gray-100 transition-colors dark:text-white dark:hover:bg-[#333740]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivered}
                  disabled={deliveryConfirmation.isDifferent && !deliveryConfirmation.finalPrice}
                  className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-black bg-[#F27D26] hover:brightness-110 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simpan Diterima
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
);
