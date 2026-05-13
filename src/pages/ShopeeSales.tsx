import React, { useMemo, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Edit2, Image as ImageIcon, Plus, Search, X } from 'lucide-react';
import { formatCurrency, formatRupiahInput, getShopeeReceivableAmount, parseCurrencyInput } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ShopeeDeliveryMethod, ShopeePurchaseMethod, ShopeeOrderStatus, ShopeeSale } from '../lib/types';

export const ShopeeSales = () => {
  const { products, shopeeSales, addShopeeSale, updateShopeeSale, updateShopeeSaleStatus } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ShopeeOrderStatus>('All');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<'All' | ShopeeDeliveryMethod>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'All' | ShopeePurchaseMethod>('All');
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [formData, setFormData] = useState({
    orderId: '',
    deliveryId: '',
    price: '',
    deliveryMethod: 'Shopee Xpress' as ShopeeDeliveryMethod,
    purchaseMethod: 'Online Payment' as ShopeePurchaseMethod,
    status: 'Shipped' as ShopeeOrderStatus,
    date: new Date().toISOString().split('T')[0]
  });
  const [items, setItems] = useState([{ productId: '', quantity: '' }]);

  const getDefaultFormData = () => ({
    orderId: '',
    deliveryId: '',
    price: '',
    deliveryMethod: 'Shopee Xpress' as ShopeeDeliveryMethod,
    purchaseMethod: 'Online Payment' as ShopeePurchaseMethod,
    status: 'Shipped' as ShopeeOrderStatus,
    date: new Date().toISOString().split('T')[0]
  });

  const handleOpenCreateModal = () => {
    setEditingSaleId(null);
    setFormData(getDefaultFormData());
    setItems([{ productId: '', quantity: '' }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sale: ShopeeSale) => {
    setEditingSaleId(sale.id);
    setFormData({
      orderId: sale.orderId,
      deliveryId: sale.deliveryId,
      price: sale.price.toString(),
      deliveryMethod: sale.deliveryMethod,
      purchaseMethod: sale.purchaseMethod,
      status: sale.status,
      date: sale.date
    });
    setItems(sale.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity.toString()
    })));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSaleId(null);
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string) => {
    setItems((prev) => prev.map((item, itemIndex) => 
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePriceChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      price: parseCurrencyInput(value),
    }));
  };

  const handlePriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setFormData((prev) => ({
        ...prev,
        price: `${prev.price}${event.key}`.replace(/^0+(?=\d)/, ''),
      }));
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      setFormData((prev) => ({
        ...prev,
        price: prev.price.slice(0, -1),
      }));
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      setFormData((prev) => ({
        ...prev,
        price: '',
      }));
    }
  };

  const getValidatedItems = () => {
    return items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = getValidatedItems();
    if (!formData.orderId || validItems.length === 0 || !formData.price || !formData.date) return;

    // Check stock if it's an active outbound order
    if (!editingSaleId && ['Shipped', 'Delivered'].includes(formData.status)) {
      const requestedByProduct = validItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
      }, {});

      for (const [productId, quantity] of Object.entries(requestedByProduct)) {
        const product = products.find(p => p.id === productId);
        if (product && product.stock < quantity) {
          alert(`Stok ${product.name} tidak cukup. Tersedia: ${product.stock}`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        orderId: formData.orderId,
        deliveryId: formData.deliveryId,
        items: validItems,
        price: Number(formData.price),
        deliveryMethod: formData.deliveryMethod,
        purchaseMethod: formData.purchaseMethod,
        status: formData.status,
        date: formData.date
      };

      if (editingSaleId) {
        await updateShopeeSale(editingSaleId, payload);
      } else {
        await addShopeeSale(payload);
      }
      
      handleCloseModal();
      setFormData(getDefaultFormData());
      setItems([{ productId: '', quantity: '' }]);
    } catch (err) {
      alert(`Gagal ${editingSaleId ? 'mengubah' : 'menyimpan'} data Shopee: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getProduct = (id: string) => {
    return products.find(p => p.id === id);
  };

  const getProductName = (id: string) => {
    const p = getProduct(id);
    return p ? p.name : 'Produk terhapus';
  };

  const getPaymentLabel = (method: ShopeePurchaseMethod) => {
    if (method === 'Online Payment') return 'Pembayaran Online';
    if (method === 'COD') return 'COD';
    return 'Shopee Pay Later';
  };

  const getStatusLabel = (status: ShopeeOrderStatus) => {
    if (status === 'Shipped') return 'Dikirim';
    if (status === 'Delivered') return 'Diterima';
    return 'Diretur';
  };

  const getStatusBadgeClass = (status: ShopeeOrderStatus) => {
    if (status === 'Shipped') return 'border-[rgba(234,179,8,0.2)] bg-[rgba(234,179,8,0.12)] text-[#CA8A04]';
    if (status === 'Delivered') return 'border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] text-[#059669]';
    return 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.12)] text-[#3B82F6]';
  };

  const statusOptions: ShopeeOrderStatus[] = ['Shipped', 'Delivered', 'Returned'];

  const toDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (value: string) => {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDateRangeLabel = () => {
    if (startDate && endDate && startDate === endDate) return formatDateLabel(startDate);
    if (startDate && endDate) return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
    if (startDate) return `Mulai ${formatDateLabel(startDate)}`;
    return 'Pilih rentang tanggal';
  };

  const handleCalendarDateClick = (dateValue: string, clickCount: number) => {
    if (clickCount >= 2) {
      setStartDate(dateValue);
      setEndDate(dateValue);
      setIsDatePanelOpen(false);
      return;
    }

    if (!startDate || (startDate && endDate)) {
      setStartDate(dateValue);
      setEndDate('');
      return;
    }

    if (dateValue < startDate) {
      setEndDate(startDate);
      setStartDate(dateValue);
      setIsDatePanelOpen(false);
      return;
    }

    setEndDate(dateValue);
    setIsDatePanelOpen(false);
  };

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const firstCalendarDate = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCalendarDate);
      date.setDate(firstCalendarDate.getDate() + index);
      const dateValue = toDateValue(date);
      const isCurrentMonth = date.getMonth() === month;
      const isSelectedStart = dateValue === startDate;
      const isSelectedEnd = dateValue === endDate;
      const isInRange = startDate && endDate && dateValue > startDate && dateValue < endDate;

      return {
        date,
        dateValue,
        isCurrentMonth,
        isSelectedStart,
        isSelectedEnd,
        isInRange,
      };
    });
  }, [endDate, startDate, visibleMonth]);

  const filteredShopeeSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...shopeeSales]
      .filter((sale) => {
        const matchesDateFrom = !startDate || sale.date >= startDate;
        const matchesDateTo = !endDate || sale.date <= endDate;
        if (!matchesDateFrom || !matchesDateTo) return false;
        if (statusFilter !== 'All' && sale.status !== statusFilter) return false;
        if (deliveryMethodFilter !== 'All' && sale.deliveryMethod !== deliveryMethodFilter) return false;
        if (paymentMethodFilter !== 'All' && sale.purchaseMethod !== paymentMethodFilter) return false;

        if (!normalizedSearch) return true;

        const productNames = sale.items
          .map((item) => getProductName(item.productId))
          .join(' ')
          .toLowerCase();
        const paymentLabel = getPaymentLabel(sale.purchaseMethod).toLowerCase();
        const statusLabel = sale.status === 'Shipped'
          ? 'dikirim shipped'
          : sale.status === 'Delivered'
            ? 'diterima delivered'
            : 'diretur retur returned';

        return [
          sale.orderId,
          sale.deliveryId,
          sale.date,
          sale.status,
          statusLabel,
          paymentLabel,
          sale.deliveryMethod,
          productNames,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveryMethodFilter, endDate, paymentMethodFilter, products, searchTerm, shopeeSales, startDate, statusFilter]);

  const hasActiveFilter = searchTerm || startDate || endDate || statusFilter !== 'All' || deliveryMethodFilter !== 'All' || paymentMethodFilter !== 'All';

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="space-y-5">
          <div className="flex flex-col gap-1 border-b border-gray-200 pb-4 dark:border-[#2A2D35]">
            <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">Filter Pengiriman Shopee</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
              {filteredShopeeSales.length} dari {shopeeSales.length} data ditampilkan
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1.2fr_0.9fr_1fr_1.1fr_auto]">
            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Cari</span>
              <div className="mt-1 flex h-10 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
                <Search size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order ID, produk, status..."
                  className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#A0A0A0] dark:placeholder:text-[#555]"
                />
              </div>
            </label>

              <div className="relative">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Tanggal</span>
                <button
                  type="button"
                  onClick={() => setIsDatePanelOpen((prev) => !prev)}
                  className="mt-1 flex h-10 w-full items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 text-left text-sm text-gray-900 outline-none transition-colors focus-visible:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
                >
                  <Calendar size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                  <span className={startDate ? 'text-gray-900 dark:text-[#A0A0A0]' : 'text-gray-400 dark:text-[#555]'}>
                    {getDateRangeLabel()}
                  </span>
                </button>

                {isDatePanelOpen && (
                  <div className="absolute left-0 top-[72px] z-30 w-[320px] border-[0.5px] border-gray-200 bg-white p-4 shadow-xl dark:border-[#333] dark:bg-[#111]">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="flex h-8 w-8 items-center justify-center border-[0.5px] border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:bg-[#161616]"
                        title="Bulan sebelumnya"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#A0A0A0]">
                        {visibleMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="flex h-8 w-8 items-center justify-center border-[0.5px] border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:bg-[#161616]"
                        title="Bulan berikutnya"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-[#555]">
                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                        <div key={day} className="py-1">{day}</div>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {calendarDays.map((day) => {
                        const isSelected = day.isSelectedStart || day.isSelectedEnd;
                        return (
                          <button
                            key={day.dateValue}
                            type="button"
                            onClick={(event) => handleCalendarDateClick(day.dateValue, event.detail)}
                            className={`h-9 text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-[#F27D26] text-black'
                                : day.isInRange
                                  ? 'bg-orange-100 text-gray-900 dark:bg-[#3A2518] dark:text-[#D0D0D0]'
                                  : day.isCurrentMonth
                                    ? 'text-gray-900 hover:bg-gray-100 dark:text-[#A0A0A0] dark:hover:bg-[#161616]'
                                    : 'text-gray-300 hover:bg-gray-50 dark:text-[#555] dark:hover:bg-[#161616]'
                            }`}
                          >
                            {day.date.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t-[0.5px] border-gray-200 pt-3 dark:border-[#333]">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#555]">Klik mulai dan akhir. Dobel klik untuk 1 tanggal.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setIsDatePanelOpen(false);
                        }}
                        className="text-[10px] font-black uppercase tracking-tighter text-gray-500 transition-colors hover:text-gray-700 dark:text-[#666] dark:hover:text-[#A0A0A0]"
                      >
                        Bersihkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Status</span>
              <div className="relative mt-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | ShopeeOrderStatus)}
                  className="h-10 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
                >
                  <option value="All">Semua Status</option>
                  <option value="Shipped">Dikirim</option>
                  <option value="Delivered">Diterima</option>
                  <option value="Returned">Diretur</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#A0A0A0]" />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Metode Pengiriman</span>
              <div className="relative mt-1">
                <select
                  value={deliveryMethodFilter}
                  onChange={(e) => setDeliveryMethodFilter(e.target.value as 'All' | ShopeeDeliveryMethod)}
                  className="h-10 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
                >
                  <option value="All">Semua Pengiriman</option>
                  <option value="Shopee Xpress">Shopee Xpress</option>
                  <option value="J&T Express">J&T Express</option>
                  <option value="JNE">JNE</option>
                  <option value="SiCepat">SiCepat</option>
                  <option value="Anteraja">Anteraja</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#A0A0A0]" />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Metode Pembayaran</span>
              <div className="relative mt-1">
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value as 'All' | ShopeePurchaseMethod)}
                  className="h-10 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
                >
                  <option value="All">Semua Pembayaran</option>
                  <option value="Online Payment">Pembayaran Online</option>
                  <option value="COD">COD</option>
                  <option value="Shopee Pay Later">Shopee Pay Later</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#A0A0A0]" />
              </div>
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setStatusFilter('All');
                setDeliveryMethodFilter('All');
                setPaymentMethodFilter('All');
              }}
              disabled={!hasActiveFilter}
              className="h-10 self-end border-[0.5px] border-[#F97316] bg-transparent px-4 text-[10px] font-black uppercase tracking-tighter text-[#F97316] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[rgba(249,115,22,0.08)]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <button 
          onClick={handleOpenCreateModal}
          className="bg-[#F27D26] hover:brightness-110 text-black px-6 py-3 text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={16} /> Tambah Data
        </button>
      </div>

      <div className="bg-stone-50 border border-gray-200 overflow-hidden shadow-sm dark:bg-[#111] dark:border-[#333]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-gray-200 text-[10px] uppercase tracking-[0.08em] font-bold text-gray-900 dark:border-[#1E1E1E] dark:text-[#E0E0E0]">
                <th className="p-4">Order ID</th>
                <th className="p-4">No. Resi</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Produk</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Harga Estimasi Penerimaan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Metode Pengiriman</th>
                <th className="p-4">Jenis Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-gray-200 dark:divide-[#1E1E1E]">
              {filteredShopeeSales.map(sale => (
                <tr key={sale.id} className="transition-colors hover:bg-gray-100 dark:bg-[#111] dark:hover:bg-[#161616]">
                  <td className="p-4 text-sm font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">{sale.orderId || '-'}</td>
                  <td className={`p-4 text-sm font-mono ${sale.deliveryId ? 'font-bold text-gray-900 dark:text-[#E0E0E0]' : 'text-gray-300 dark:text-[#3A3A3A]'}`}>
                    {sale.deliveryId || <span>&mdash;</span>}
                  </td>
                  <td className="p-4 text-sm font-mono text-gray-700 dark:text-[#D0D0D0]">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-semibold">
                    <div className="space-y-3">
                      {sale.items.map((item) => (
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
                      {sale.items.map((item) => (
                        <div key={item.id}>{item.quantity}</div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold font-mono text-gray-700 dark:text-[#D0D0D0]">
                    {sale.status === 'Shipped' ? 'Belum diterima' : formatCurrency(getShopeeReceivableAmount(sale))}
                  </td>
                  <td className="p-4">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setOpenStatusMenuId((current) => current === sale.id ? null : sale.id)}
                        className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] uppercase font-black tracking-widest ${getStatusBadgeClass(sale.status)}`}
                      >
                        {getStatusLabel(sale.status)}
                        <ChevronDown size={13} />
                      </button>

                      {openStatusMenuId === sale.id && (
                        <div className="absolute left-0 top-8 z-30 w-32 border-[0.5px] border-[#333] bg-[#111] py-1 shadow-xl">
                          {statusOptions.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                setOpenStatusMenuId(null);
                                updateShopeeSaleStatus(sale.id, status)
                                  .catch((err) => {
                                    alert(`Gagal mengubah status Shopee: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
                                  });
                              }}
                              className={`block w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-[#161616] ${getStatusBadgeClass(status)}`}
                            >
                              {getStatusLabel(status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#888]">
                    {sale.deliveryMethod}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#888]">
                        {getPaymentLabel(sale.purchaseMethod)}
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(sale)}
                        className="text-gray-500 transition-colors hover:text-gray-700 dark:text-[#888] dark:hover:text-[#E0E0E0]"
                        title="Edit data"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredShopeeSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                    {hasActiveFilter ? 'Tidak ada data Shopee yang cocok dengan filter.' : 'Tidak ada data Shopee ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-50 border border-gray-200 w-full max-w-lg overflow-hidden text-gray-900 shadow-xl dark:bg-[#151619] dark:border-[#2A2D35] dark:text-[#E0E2E6]"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center dark:border-[#2A2D35]">
                <h3 className="text-sm font-bold uppercase italic">{editingSaleId ? 'Edit Data Shopee' : 'Input Shopee Baru'}</h3>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">ID Pesanan <span className="text-[#F27D26]">*</span></label>
                    <input 
                      type="text" 
                      required 
                      placeholder="contoh: 231124XXX"
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.orderId}
                      onChange={e => setFormData({...formData, orderId: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Tanggal</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
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
                      <div className="relative">
                        <select 
                          required 
                          className="w-full appearance-none bg-white border border-gray-300 p-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', e.target.value)}
                        >
                          <option value="" disabled>Pilih produk...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#8E9299]" />
                      </div>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
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
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">No. Resi</label>
                  <input 
                    type="text" 
                    placeholder="contoh: SPXID123456789"
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.deliveryId}
                    onChange={e => setFormData({...formData, deliveryId: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Harga Estimasi Penerimaan</label>
                  <input 
                    type="text" 
                    required 
                    inputMode="numeric"
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formatRupiahInput(formData.price)}
                    onChange={e => handlePriceChange(e.target.value)}
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
                      onChange={e => setFormData({...formData, status: e.target.value as ShopeeOrderStatus})}
                    >
                      <option value="Shipped">Dikirim</option>
                      <option value="Delivered">Diterima</option>
                      <option value="Returned">Retur</option>
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
                      onChange={e => setFormData({...formData, deliveryMethod: e.target.value as ShopeeDeliveryMethod})}
                    >
                      <option value="Shopee Xpress">Shopee Xpress</option>
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
                      onChange={e => setFormData({...formData, purchaseMethod: e.target.value as ShopeePurchaseMethod})}
                    >
                      <option value="Online Payment">Pembayaran Online</option>
                      <option value="COD">Bayar di Tempat (COD)</option>
                      <option value="Shopee Pay Later">Shopee Pay Later</option>
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#8E9299]" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-gray-700 hover:bg-gray-100 transition-colors dark:text-white dark:hover:bg-[#333740]"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-black bg-[#F27D26] hover:brightness-110 transition-colors"
                  >
                    {isSaving ? 'Menyimpan...' : editingSaleId ? 'Simpan Perubahan' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
