import React from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { ShopeeDeliveryMethod, ShopeeOrderStatus, ShopeePurchaseMethod } from '../../lib/types';

type CalendarDay = {
  date: Date;
  dateValue: string;
  isCurrentMonth: boolean;
  isSelectedStart: boolean;
  isSelectedEnd: boolean;
  isInRange: string | boolean;
};

type DatePreset = 'today' | 'yesterday' | 'sevenDays';

type ShopeeSalesControlsProps = {
  filteredCount: number;
  totalCount: number;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  startDate: string;
  statusFilter: 'All' | ShopeeOrderStatus;
  setStatusFilter: React.Dispatch<React.SetStateAction<'All' | ShopeeOrderStatus>>;
  deliveryMethodFilter: 'All' | ShopeeDeliveryMethod;
  setDeliveryMethodFilter: React.Dispatch<React.SetStateAction<'All' | ShopeeDeliveryMethod>>;
  paymentMethodFilter: 'All' | ShopeePurchaseMethod;
  setPaymentMethodFilter: React.Dispatch<React.SetStateAction<'All' | ShopeePurchaseMethod>>;
  isDatePanelOpen: boolean;
  setIsDatePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  visibleMonth: Date;
  setVisibleMonth: React.Dispatch<React.SetStateAction<Date>>;
  calendarDays: CalendarDay[];
  hasActiveFilter: string | boolean;
  getDateRangeLabel: () => string;
  handleCalendarDateClick: (dateValue: string, clickCount: number) => void;
  applyDatePreset: (preset: DatePreset) => void;
  handleOpenCreateModal: () => void;
  getShipmentPeriodLabel: () => string;
};

export const ShopeeSalesControls = ({
  filteredCount,
  totalCount,
  searchTerm,
  setSearchTerm,
  startDate,
  statusFilter,
  setStatusFilter,
  deliveryMethodFilter,
  setDeliveryMethodFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  isDatePanelOpen,
  setIsDatePanelOpen,
  visibleMonth,
  setVisibleMonth,
  calendarDays,
  hasActiveFilter,
  getDateRangeLabel,
  handleCalendarDateClick,
  applyDatePreset,
  handleOpenCreateModal,
  getShipmentPeriodLabel,
}: ShopeeSalesControlsProps) => (
  <>
    <div className="bg-stone-50 border border-gray-200 p-4 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
      <div className="space-y-3">
        <div className="flex flex-col gap-1 border-b border-gray-200 pb-3 dark:border-[#2A2D35]">
          <h3 className="text-xs font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">Filter Pengiriman Shopee</h3>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
            {filteredCount} dari {totalCount} data ditampilkan
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Cari</span>
            <div className="mt-1 flex h-9 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-2.5 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
              <Search size={14} className="text-gray-500 dark:text-[#A0A0A0]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order ID, produk, status..."
                className="w-full bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#A0A0A0] dark:placeholder:text-[#555]"
              />
            </div>
          </label>

          <div className="relative">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Tanggal</span>
            <button
              type="button"
              onClick={() => setIsDatePanelOpen((prev) => !prev)}
              className="mt-1 flex h-9 w-full items-center gap-2 border-[0.5px] border-gray-300 bg-white px-2.5 text-left text-xs text-gray-900 outline-none transition-colors focus-visible:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
            >
              <Calendar size={14} className="text-gray-500 dark:text-[#A0A0A0]" />
              <span className={startDate ? 'text-gray-900 dark:text-[#A0A0A0]' : 'text-gray-400 dark:text-[#555]'}>
                {getDateRangeLabel()}
              </span>
            </button>

            {isDatePanelOpen && (
              <div className="absolute left-0 top-[64px] z-30 w-[300px] border-[0.5px] border-gray-200 bg-white p-3 shadow-xl dark:border-[#333] dark:bg-[#111]">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="flex h-7 w-7 items-center justify-center border-[0.5px] border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:bg-[#161616]"
                    title="Bulan sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-[#A0A0A0]">
                    {visibleMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="flex h-7 w-7 items-center justify-center border-[0.5px] border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-[#333] dark:text-[#A0A0A0] dark:hover:bg-[#161616]"
                    title="Bulan berikutnya"
                  >
                    <ChevronRight size={14} />
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
                        className={`h-8 text-[11px] font-bold transition-colors ${
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

                <div className="mt-2 flex items-center justify-between gap-2 border-t-[0.5px] border-gray-200 pt-2 dark:border-[#333]">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#555]">Klik mulai dan akhir. Dobel klik untuk 1 tanggal.</p>
                  <button
                    type="button"
                    onClick={() => {
                      applyDatePreset('today');
                      setIsDatePanelOpen(false);
                    }}
                    className="text-[10px] font-black uppercase tracking-tighter text-gray-500 transition-colors hover:text-gray-700 dark:text-[#666] dark:hover:text-[#A0A0A0]"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Status</span>
            <div className="relative mt-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | ShopeeOrderStatus)}
                className="h-9 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-2.5 pr-8 text-xs text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
              >
                <option value="All">Semua Status</option>
                <option value="Shipped">Dikirim</option>
                <option value="Delivered">Diterima</option>
                <option value="Returned">Diretur</option>
                <option value="Postponed">Ditunda</option>
                <option value="Cancelled">Dibatal</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute inset-y-0 right-2.5 my-auto text-gray-500 dark:text-[#A0A0A0]" />
            </div>
          </label>

          <label className="block">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Metode Pengiriman</span>
            <div className="relative mt-1">
              <select
                value={deliveryMethodFilter}
                onChange={(e) => setDeliveryMethodFilter(e.target.value as 'All' | ShopeeDeliveryMethod)}
                className="h-9 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-2.5 pr-8 text-xs text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
              >
                <option value="All">Semua Pengiriman</option>
                <option value="Shopee Xpress">Shopee Xpress</option>
                <option value="Shopee Xpress Instant">Shopee Xpress Instant</option>
                <option value="J&T Express">J&T Express</option>
                <option value="JNE">JNE</option>
                <option value="SiCepat">SiCepat</option>
                <option value="Anteraja">Anteraja</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute inset-y-0 right-2.5 my-auto text-gray-500 dark:text-[#A0A0A0]" />
            </div>
          </label>

          <label className="block">
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Metode Pembayaran</span>
            <div className="relative mt-1">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as 'All' | ShopeePurchaseMethod)}
                className="h-9 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-2.5 pr-8 text-xs text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
              >
                <option value="All">Semua Pembayaran</option>
                <option value="Online Payment">Pembayaran Online</option>
                <option value="COD">COD</option>
                <option value="Shopee Pay Later">Shopee Pay Later</option>
                <option value="Instant">Instant</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute inset-y-0 right-2.5 my-auto text-gray-500 dark:text-[#A0A0A0]" />
            </div>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              applyDatePreset('today');
              setStatusFilter('All');
              setDeliveryMethodFilter('All');
              setPaymentMethodFilter('All');
            }}
            disabled={!hasActiveFilter}
            className="h-9 self-end border-[0.5px] border-[#F97316] bg-transparent px-3 text-[9px] font-black uppercase tracking-tighter text-[#F97316] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[rgba(249,115,22,0.08)]"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-[#2A2D35]">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">WAKTU</span>
          {[
            { label: 'Hari Ini', preset: 'today' as const },
            { label: 'Kemarin', preset: 'yesterday' as const },
            { label: '7 Hari', preset: 'sevenDays' as const },
          ].map((option) => (
            <button
              key={option.preset}
              type="button"
              onClick={() => applyDatePreset(option.preset)}
              className="border-[0.5px] border-gray-300 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter text-gray-700 transition-colors hover:border-[#F97316] hover:text-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0] dark:hover:border-[#F97316] dark:hover:text-[#F97316]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <button
        onClick={handleOpenCreateModal}
        className="bg-[#F27D26] hover:brightness-110 text-black px-4 py-2.5 text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
      >
        <Plus size={14} /> Tambah Data
      </button>
      <div className="self-start py-1 text-[10px] font-black uppercase tracking-widest text-black dark:text-[#F97316] sm:self-auto">
        {getShipmentPeriodLabel()}
      </div>
    </div>
  </>
);
