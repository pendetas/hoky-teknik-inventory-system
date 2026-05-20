import React, { useMemo, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Edit2, Image as ImageIcon, Plus, Printer, ReceiptText, Search, X } from 'lucide-react';
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
  const [deliveryConfirmation, setDeliveryConfirmation] = useState<{
    sale: ShopeeSale;
    finalPrice: string;
    isDifferent: boolean;
  } | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<{
    sale: ShopeeSale;
    buyerName: string;
    invoiceNo: string;
  } | null>(null);
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
    note: '',
    status: 'Shipped' as ShopeeOrderStatus,
    date: new Date().toISOString().split('T')[0],
    finalReceiptAmount: null as number | null
  });
  const [items, setItems] = useState([{ productId: '', quantity: '' }]);

  const getDefaultFormData = () => ({
    orderId: '',
    deliveryId: '',
    price: '',
    deliveryMethod: 'Shopee Xpress' as ShopeeDeliveryMethod,
    purchaseMethod: 'Online Payment' as ShopeePurchaseMethod,
    note: '',
    status: 'Shipped' as ShopeeOrderStatus,
    date: new Date().toISOString().split('T')[0],
    finalReceiptAmount: null as number | null
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
      note: sale.note,
      status: sale.status,
      date: sale.date,
      finalReceiptAmount: sale.finalReceiptAmount
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
        note: formData.note.trim(),
        status: formData.status,
        date: formData.date,
        finalReceiptAmount: formData.status === 'Delivered' ? formData.finalReceiptAmount : null
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

  const getInvoiceAmount = (sale: ShopeeSale) => {
    return sale.status === 'Shipped' ? sale.price : getShopeeReceivableAmount(sale);
  };

  const getInvoiceLineAmount = (sale: ShopeeSale, quantity: number) => {
    const totalQuantity = sale.items.reduce((total, item) => total + item.quantity, 0);
    if (totalQuantity <= 0) return 0;

    return Math.round((getInvoiceAmount(sale) / totalQuantity) * quantity);
  };

  const handleOpenInvoiceModal = (sale: ShopeeSale) => {
    setInvoiceDraft({
      sale,
      buyerName: '',
      invoiceNo: sale.orderId || sale.deliveryId || '',
    });
  };

  const handlePrintInvoice = () => {
    if (!invoiceDraft?.buyerName.trim()) return;
    window.print();
  };

  const getPaymentLabel = (method: ShopeePurchaseMethod) => {
    if (method === 'Online Payment') return 'Pembayaran Online';
    if (method === 'COD') return 'COD';
    if (method === 'Instant') return 'Instant';
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

  const handleStatusChange = (sale: ShopeeSale, status: ShopeeOrderStatus) => {
    setOpenStatusMenuId(null);

    if (status === 'Delivered' && sale.status !== 'Delivered') {
      setDeliveryConfirmation({
        sale,
        finalPrice: String(sale.finalReceiptAmount ?? sale.price),
        isDifferent: false,
      });
      return;
    }

    updateShopeeSaleStatus(sale.id, status)
      .catch((err) => {
        alert(`Gagal mengubah status Shopee: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
      });
  };

  const handleFinalPriceChange = (value: string) => {
    setDeliveryConfirmation((prev) => prev
      ? { ...prev, finalPrice: parseCurrencyInput(value) }
      : prev
    );
  };

  const handleFinalPriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setDeliveryConfirmation((prev) => prev
        ? { ...prev, finalPrice: `${prev.finalPrice}${event.key}`.replace(/^0+(?=\d)/, '') }
        : prev
      );
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      setDeliveryConfirmation((prev) => prev
        ? { ...prev, finalPrice: prev.finalPrice.slice(0, -1) }
        : prev
      );
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      setDeliveryConfirmation((prev) => prev
        ? { ...prev, finalPrice: '' }
        : prev
      );
    }
  };

  const handleConfirmDelivered = async () => {
    if (!deliveryConfirmation) return;

    const finalAmount = deliveryConfirmation.isDifferent
      ? Number(deliveryConfirmation.finalPrice)
      : deliveryConfirmation.sale.price;

    if (!finalAmount || finalAmount < 0) return;

    try {
      await updateShopeeSaleStatus(deliveryConfirmation.sale.id, {
        status: 'Delivered',
        finalReceiptAmount: finalAmount,
      });
      setDeliveryConfirmation(null);
    } catch (err) {
      alert(`Gagal mengubah status Shopee: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    }
  };

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
          sale.note,
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  <option value="Instant">Instant</option>
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
          className="bg-[#F27D26] hover:brightness-110 text-black px-6 py-3 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
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
                <th className="p-4">Penerimaan Shopee</th>
                <th className="p-4">Status</th>
                <th className="p-4">Metode Pengiriman</th>
                <th className="p-4">Jenis Pembayaran</th>
                <th className="p-4">Catatan</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-gray-200 dark:divide-[#1E1E1E]">
              {filteredShopeeSales.map(sale => {
                const hasMultipleItems = sale.items.length > 1;

                return (
                <tr key={sale.id} className="transition-colors hover:bg-gray-100 dark:bg-[#111] dark:hover:bg-[#161616]">
                  <td className="p-4 align-middle text-sm font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">{sale.orderId || '-'}</td>
                  <td className="p-4 align-middle text-sm font-mono font-bold text-gray-900 dark:text-[#E0E0E0]">
                    {sale.deliveryId || <span>&mdash;</span>}
                  </td>
                  <td className="p-4 align-middle text-sm font-mono text-gray-900 dark:text-[#E0E0E0]">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className={`p-4 text-sm font-semibold ${hasMultipleItems ? 'align-top' : 'align-middle'}`}>
                    <div className="space-y-3">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex min-h-10 items-center gap-3 text-gray-900 dark:text-[#E0E0E0]">
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
                  <td className={`p-4 text-sm font-mono text-gray-900 dark:text-[#E0E0E0] ${hasMultipleItems ? 'align-top' : 'align-middle'}`}>
                    <div className="space-y-3">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex min-h-10 items-center">{item.quantity}</div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-sm font-bold font-mono text-gray-950 dark:text-white">
                    {sale.status === 'Shipped'
                      ? `Estimasi: ${formatCurrency(sale.price)}`
                      : `${sale.finalReceiptAmount === null ? 'Estimasi: ' : 'Final: '}${formatCurrency(getShopeeReceivableAmount(sale))}`}
                  </td>
                  <td className="p-4 align-middle">
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
                              onClick={() => handleStatusChange(sale, status)}
                              className={`block w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-[#161616] ${getStatusBadgeClass(status)}`}
                            >
                              {getStatusLabel(status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-xs font-semibold text-gray-900 dark:text-[#E0E0E0]">
                    {sale.deliveryMethod}
                  </td>
                  <td className="p-4 align-middle text-xs font-semibold text-gray-900 dark:text-[#E0E0E0]">
                    {getPaymentLabel(sale.purchaseMethod)}
                  </td>
                  <td className="max-w-48 p-4 align-middle text-xs font-medium text-gray-600 dark:text-[#A0A0A0]">
                    <span className="line-clamp-3" title={sale.note || undefined}>
                      {sale.note || <span>&mdash;</span>}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => handleOpenInvoiceModal(sale)}
                        className="flex h-8 w-8 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:border-[#F27D26] hover:text-[#F27D26] dark:border-[#333] dark:text-[#888] dark:hover:border-[#F27D26] dark:hover:text-[#F27D26]"
                        title="Cetak invoice"
                      >
                        <ReceiptText size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(sale)}
                        className="flex h-8 w-8 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-800 dark:border-[#333] dark:text-[#888] dark:hover:border-[#555] dark:hover:text-[#E0E0E0]"
                        title="Edit data"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredShopeeSales.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
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
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    placeholder="Catatan tambahan untuk pengiriman Shopee"
                    rows={3}
                  />
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
    </div>
  );
};
