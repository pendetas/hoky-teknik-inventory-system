import React, { useEffect, useMemo, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { getShopeeReceivableAmount, parseCurrencyInput } from '../lib/utils';
import { ShopeeDeliveryMethod, ShopeePurchaseMethod, ShopeeOrderStatus, ShopeeSale } from '../lib/types';
import { ShopeeSalesControls } from './shopee-sales/ShopeeSalesControls';
import { ShopeeSalesTable } from './shopee-sales/ShopeeSalesTable';
import {
  ShopeeDeliveryConfirmation,
  ShopeeInvoiceDraft,
  ShopeeSaleFormData,
  ShopeeSaleFormItem,
  ShopeeSalesModals,
} from './shopee-sales/ShopeeSalesModals';

const getLocalDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SHOPEE_SALES_PAGE_SIZE = 10;

export const ShopeeSales = () => {
  const { products, shopeeSales, addShopeeSale, updateShopeeSale, updateShopeeSaleStatus, deleteShopeeSale } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => getLocalDateValue());
  const [endDate, setEndDate] = useState(() => getLocalDateValue());
  const [statusFilter, setStatusFilter] = useState<'All' | ShopeeOrderStatus>('All');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<'All' | ShopeeDeliveryMethod>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'All' | ShopeePurchaseMethod>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [deliveryConfirmation, setDeliveryConfirmation] = useState<ShopeeDeliveryConfirmation | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<ShopeeInvoiceDraft | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [formData, setFormData] = useState<ShopeeSaleFormData>({
    orderId: '',
    deliveryId: '',
    price: '',
    deliveryMethod: 'Shopee Xpress' as ShopeeDeliveryMethod,
    purchaseMethod: 'Online Payment' as ShopeePurchaseMethod,
    note: '',
    status: 'Shipped' as ShopeeOrderStatus,
    date: getLocalDateValue(),
    finalReceiptAmount: null as number | null
  });
  const [items, setItems] = useState<ShopeeSaleFormItem[]>([{ productId: '', quantity: '' }]);
  const [formValidationError, setFormValidationError] = useState('');
  const [itemValidationError, setItemValidationError] = useState('');

  const getDefaultFormData = () => ({
    orderId: '',
    deliveryId: '',
    price: '',
    deliveryMethod: 'Shopee Xpress' as ShopeeDeliveryMethod,
    purchaseMethod: 'Online Payment' as ShopeePurchaseMethod,
    note: '',
    status: 'Shipped' as ShopeeOrderStatus,
    date: getLocalDateValue(),
    finalReceiptAmount: null as number | null
  });

  const handleOpenCreateModal = () => {
    setEditingSaleId(null);
    setFormData(getDefaultFormData());
    setItems([{ productId: '', quantity: '' }]);
    setFormValidationError('');
    setItemValidationError('');
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
    setFormValidationError('');
    setItemValidationError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSaleId(null);
    setFormValidationError('');
    setItemValidationError('');
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string) => {
    setItemValidationError('');
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

  const normalizeDuplicateKey = (value: string) => value.trim().toLowerCase();

  const getOrderIdentityValidationError = () => {
    const orderId = formData.orderId.trim();
    const deliveryId = formData.deliveryId.trim();

    if (!orderId) return 'ID Pesanan wajib diisi.';
    if (!deliveryId) return 'No. Resi wajib diisi.';

    const normalizedOrderId = normalizeDuplicateKey(orderId);
    const normalizedDeliveryId = normalizeDuplicateKey(deliveryId);

    const duplicateOrder = shopeeSales.find((sale) =>
      sale.id !== editingSaleId && normalizeDuplicateKey(sale.orderId) === normalizedOrderId
    );

    if (duplicateOrder) {
      return `ID Pesanan sudah pernah diinput: ${duplicateOrder.orderId}.`;
    }

    const duplicateDelivery = shopeeSales.find((sale) =>
      sale.id !== editingSaleId && normalizeDuplicateKey(sale.deliveryId) === normalizedDeliveryId
    );

    if (duplicateDelivery) {
      return `No. Resi sudah pernah diinput: ${duplicateDelivery.deliveryId}.`;
    }

    return '';
  };

  const getItemValidationError = () => {
    let hasCompleteItem = false;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const hasProduct = item.productId.trim() !== '';
      const hasQuantityInput = item.quantity.trim() !== '';
      const quantity = Number(item.quantity);

      if (!hasProduct && !hasQuantityInput) continue;

      if (!hasProduct || !hasQuantityInput) {
        return `Lengkapi produk dan quantity pada baris ${index + 1}.`;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return `Quantity pada baris ${index + 1} harus lebih dari 0.`;
      }

      hasCompleteItem = true;
    }

    return hasCompleteItem ? '' : 'Pilih minimal satu produk dan isi quantity.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderIdentityValidationError = getOrderIdentityValidationError();
    if (orderIdentityValidationError) {
      setFormValidationError(orderIdentityValidationError);
      return;
    }

    const validationError = getItemValidationError();
    if (validationError) {
      setItemValidationError(validationError);
      return;
    }

    const validItems = getValidatedItems();
    if (validItems.length === 0 || !formData.price || !formData.date) return;

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

  const handleDeleteShopeeSale = async () => {
    if (!editingSaleId || isDeleting) return;

    const confirmed = window.confirm(
      [
        'Hapus data Shopee ini?',
        '',
        `Order ID: ${formData.orderId || '-'}`,
        `No. Resi: ${formData.deliveryId || '-'}`,
        '',
        'Jika order ini sudah mengurangi stok, stok akan dikembalikan oleh sistem.',
        'Data order dan item akan dihapus permanen.',
      ].join('\n')
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteShopeeSale(editingSaleId);
      handleCloseModal();
      setFormData(getDefaultFormData());
      setItems([{ productId: '', quantity: '' }]);
    } catch (err) {
      alert(`Gagal menghapus data Shopee: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    } finally {
      setIsDeleting(false);
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
    if (status === 'Postponed') return 'Ditunda';
    if (status === 'Cancelled') return 'Dibatal';
    return 'Diretur';
  };

  const getStatusBadgeClass = (status: ShopeeOrderStatus) => {
    if (status === 'Shipped') return 'border-[rgba(234,179,8,0.2)] bg-[rgba(234,179,8,0.12)] text-[#CA8A04]';
    if (status === 'Delivered') return 'border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] text-[#059669]';
    if (status === 'Postponed') return 'border-[rgba(255,255,255,0.28)] bg-[#6B7280] text-white dark:bg-[rgba(255,255,255,0.12)] dark:text-white';
    if (status === 'Cancelled') return 'border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.12)] text-[#EF4444]';
    return 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.12)] text-[#3B82F6]';
  };

  const statusOptions: ShopeeOrderStatus[] = ['Shipped', 'Delivered', 'Returned', 'Postponed', 'Cancelled'];

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

  const formatShortDateLabel = (value: string) => {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatOrderTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).replace('.', ':');
  };

  const getShiftedDateValue = (daysBack: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return getLocalDateValue(date);
  };

  const applyDatePreset = (preset: 'today' | 'yesterday' | 'sevenDays') => {
    const today = getLocalDateValue();

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
      setVisibleMonth(new Date());
      return;
    }

    if (preset === 'yesterday') {
      const yesterday = getShiftedDateValue(1);
      setStartDate(yesterday);
      setEndDate(yesterday);
      setVisibleMonth(new Date(`${yesterday}T00:00:00`));
      return;
    }

    setStartDate(getShiftedDateValue(6));
    setEndDate(today);
    setVisibleMonth(new Date());
  };

  const getShipmentPeriodLabel = () => {
    const today = getLocalDateValue();
    const yesterday = getShiftedDateValue(1);
    const sevenDaysStart = getShiftedDateValue(6);

    if (startDate === today && endDate === today) return `Kiriman Hari Ini (${formatShortDateLabel(today)})`;
    if (startDate === yesterday && endDate === yesterday) return `Kiriman Kemarin (${formatShortDateLabel(yesterday)})`;
    if (startDate === sevenDaysStart && endDate === today) {
      return `Kiriman 7 Hari (${formatShortDateLabel(sevenDaysStart)} - ${formatShortDateLabel(today)})`;
    }
    if (startDate && endDate) return `Kiriman ${formatShortDateLabel(startDate)} - ${formatShortDateLabel(endDate)}`;
    if (startDate) return `Kiriman Mulai ${formatShortDateLabel(startDate)}`;
    return `Kiriman Hari Ini (${formatShortDateLabel(today)})`;
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
      const dateValue = getLocalDateValue(date);
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
        const statusLabel = `${getStatusLabel(sale.status)} ${sale.status}`.toLowerCase();

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
      .sort((a, b) => {
        const dateCompare = new Date(`${b.date}T00:00:00`).getTime() - new Date(`${a.date}T00:00:00`).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [deliveryMethodFilter, endDate, paymentMethodFilter, products, searchTerm, shopeeSales, startDate, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deliveryMethodFilter, endDate, paymentMethodFilter, searchTerm, startDate, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredShopeeSales.length / SHOPEE_SALES_PAGE_SIZE));
  const firstVisibleIndex = (currentPage - 1) * SHOPEE_SALES_PAGE_SIZE;
  const paginatedShopeeSales = filteredShopeeSales.slice(
    firstVisibleIndex,
    firstVisibleIndex + SHOPEE_SALES_PAGE_SIZE
  );

  const hasActiveFilter = searchTerm || startDate || endDate || statusFilter !== 'All' || deliveryMethodFilter !== 'All' || paymentMethodFilter !== 'All';

  return (
    <div className="space-y-4">
      <ShopeeSalesControls
        filteredCount={filteredShopeeSales.length}
        totalCount={shopeeSales.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        startDate={startDate}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        deliveryMethodFilter={deliveryMethodFilter}
        setDeliveryMethodFilter={setDeliveryMethodFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        isDatePanelOpen={isDatePanelOpen}
        setIsDatePanelOpen={setIsDatePanelOpen}
        visibleMonth={visibleMonth}
        setVisibleMonth={setVisibleMonth}
        calendarDays={calendarDays}
        hasActiveFilter={hasActiveFilter}
        getDateRangeLabel={getDateRangeLabel}
        handleCalendarDateClick={handleCalendarDateClick}
        applyDatePreset={applyDatePreset}
        handleOpenCreateModal={handleOpenCreateModal}
        getShipmentPeriodLabel={getShipmentPeriodLabel}
      />

      <ShopeeSalesTable
        paginatedShopeeSales={paginatedShopeeSales}
        filteredShopeeSalesLength={filteredShopeeSales.length}
        pageSize={SHOPEE_SALES_PAGE_SIZE}
        firstVisibleIndex={firstVisibleIndex}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        hasActiveFilter={hasActiveFilter}
        openStatusMenuId={openStatusMenuId}
        setOpenStatusMenuId={setOpenStatusMenuId}
        statusOptions={statusOptions}
        getProduct={getProduct}
        getProductName={getProductName}
        formatOrderTime={formatOrderTime}
        getStatusBadgeClass={getStatusBadgeClass}
        getStatusLabel={getStatusLabel}
        getPaymentLabel={getPaymentLabel}
        handleStatusChange={handleStatusChange}
        handleOpenInvoiceModal={handleOpenInvoiceModal}
        handleOpenEditModal={handleOpenEditModal}
      />

      <ShopeeSalesModals
        products={products}
        isModalOpen={isModalOpen}
        editingSaleId={editingSaleId}
        formData={formData}
        setFormData={setFormData}
        items={items}
        formValidationError={formValidationError}
        setFormValidationError={setFormValidationError}
        itemValidationError={itemValidationError}
        isSaving={isSaving}
        isDeleting={isDeleting}
        handleCloseModal={handleCloseModal}
        handleSubmit={handleSubmit}
        handleAddItem={handleAddItem}
        handleItemChange={handleItemChange}
        handleRemoveItem={handleRemoveItem}
        handlePriceChange={handlePriceChange}
        handlePriceKeyDown={handlePriceKeyDown}
        handleDeleteShopeeSale={handleDeleteShopeeSale}
        invoiceDraft={invoiceDraft}
        setInvoiceDraft={setInvoiceDraft}
        handlePrintInvoice={handlePrintInvoice}
        getInvoiceAmount={getInvoiceAmount}
        getInvoiceLineAmount={getInvoiceLineAmount}
        getProductName={getProductName}
        deliveryConfirmation={deliveryConfirmation}
        setDeliveryConfirmation={setDeliveryConfirmation}
        handleFinalPriceChange={handleFinalPriceChange}
        handleFinalPriceKeyDown={handleFinalPriceKeyDown}
        handleConfirmDelivered={handleConfirmDelivered}
      />
    </div>
  );
};
