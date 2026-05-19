import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, ShoppingBag, Store, Package, FileSpreadsheet, LogOut, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';

const SidebarLink = ({ to, icon: Icon, children }: { to: string, icon: React.ElementType, children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 transition-all duration-200 text-sm font-bold uppercase tracking-widest whitespace-nowrap",
        isActive 
          ? "border-l-2 border-[#F27D26] text-gray-950 opacity-100 dark:text-white" 
          : "text-gray-500 opacity-70 hover:text-gray-950 hover:opacity-100 dark:text-[#8E9299] dark:hover:text-white"
      )}
    >
      <Icon size={20} className={cn(isActive ? "text-gray-950 dark:text-white" : "text-gray-500 dark:text-[#8E9299]")} />
      {children}
    </NavLink>
  );
};

const SidebarSubLink = ({ to, children }: { to: string, children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        "ml-8 flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap",
        isActive
          ? "border-l-2 border-[#F27D26] text-gray-950 dark:text-white"
          : "text-gray-500 opacity-70 hover:text-gray-950 hover:opacity-100 dark:text-[#8E9299] dark:hover:text-white"
      )}
    >
      {children}
    </NavLink>
  );
};

const pageTitles: Record<string, string> = {
  '/': 'Ringkasan',
  '/products': 'Produk',
  '/shopee-sales': 'Pengiriman Shopee',
  '/shopee-returns': 'Pengembalian Shopee',
  '/store-sales': 'Pengiriman Toko',
  '/reports': 'Laporan Toko',
  '/reports/shopee': 'Laporan Shopee',
  '/reports/store': 'Laporan Toko',
};

const pageSubtitles: Record<string, string> = {
  '/': 'Overview performa stok, penjualan, dan aktivitas terbaru.',
  '/products': 'Kelola katalog produk, stok gudang, foto, dan jejak restock.',
  '/shopee-sales': 'Pantau order, resi, status pengiriman, penerimaan, dan invoice.',
  '/shopee-returns': 'Kelola kasus retur, kompensasi, dan tindak lanjut dari Shopee.',
  '/store-sales': 'Catat pengiriman toko, pembayaran, tempo, dan pengurangan stok.',
  '/reports': 'Ekspor ringkasan toko dan kondisi inventaris.',
  '/reports/shopee': 'Ekspor performa Shopee, order, retur, dan omset diakui.',
  '/reports/store': 'Ekspor performa pengiriman toko dan stok inventaris.',
};

const THEME_STORAGE_KEY = 'hoky-teknik-theme';

export const Layout = () => {
  const location = useLocation();
  const [isDarkTheme, setIsDarkTheme] = React.useState(() => document.documentElement.classList.contains('dark'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const handleThemeToggle = () => {
    const nextIsDarkTheme = !isDarkTheme;
    setIsDarkTheme(nextIsDarkTheme);
    document.documentElement.classList.toggle('dark', nextIsDarkTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextIsDarkTheme ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans text-gray-900 dark:bg-[#0F1115] dark:text-[#E0E2E6]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed h-full z-10 flex flex-col flex-shrink-0 border-r border-gray-200 bg-stone-50 transition-transform duration-300 dark:bg-[#090A0C] dark:border-[#2A2D35]",
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0",
          "w-64"
        )}
      >
        <div className="h-36 flex items-center px-6 border-b border-gray-200 dark:border-[#2A2D35]">
          <div className="flex flex-col text-[#F27D26] font-black text-[30px] italic tracking-tighter uppercase leading-none p-2">
            <span>HOKY</span>
            <span className="ml-14 mt-2">TEKNIK</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(true)}
          className="absolute -right-4 top-1/2 z-20 flex h-10 w-8 -translate-y-1/2 items-center justify-center border border-gray-200 bg-stone-50 text-gray-500 shadow-sm transition-colors hover:border-[#F27D26] hover:text-[#F27D26] dark:border-[#2A2D35] dark:bg-[#090A0C] dark:text-[#8E9299] dark:hover:border-[#F27D26] dark:hover:text-[#F27D26]"
          title="Tutup sidebar"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex-1 overflow-y-auto p-4 py-5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-3 dark:text-[#8E9299]">Manajemen</div>
          <SidebarLink to="/" icon={LayoutDashboard}>Ringkasan</SidebarLink>
          <SidebarLink to="/products" icon={Package}>Produk</SidebarLink>
          
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-3 dark:text-[#8E9299]">Penjualan & Operasional</div>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-[#E0E2E6]">
              <span className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-gray-500 dark:text-[#8E9299]" />
                Shopee
              </span>
              <ChevronDown size={16} className="text-gray-500 dark:text-[#8E9299]" />
            </div>
          </div>
          <SidebarSubLink to="/shopee-sales">Pengiriman Shopee</SidebarSubLink>
          <SidebarSubLink to="/shopee-returns">Pengembalian Shopee</SidebarSubLink>
          <SidebarLink to="/store-sales" icon={Store}>Pengiriman Toko</SidebarLink>
          
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-3 dark:text-[#8E9299]">Analitik</div>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-[#E0E2E6]">
              <span className="flex items-center gap-3">
                <FileSpreadsheet size={20} className="text-gray-500 dark:text-[#8E9299]" />
                Laporan
              </span>
              <ChevronDown size={16} className="text-gray-500 dark:text-[#8E9299]" />
            </div>
          </div>
          <SidebarSubLink to="/reports/shopee">Laporan Shopee</SidebarSubLink>
          <SidebarSubLink to="/reports/store">Laporan Toko</SidebarSubLink>
        </div>
        
        <div className="p-3 border-t border-gray-200 space-y-2 dark:border-[#2A2D35]">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="flex items-center justify-between gap-3 px-3 py-2 w-full text-sm font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-100 hover:text-gray-950 transition-colors rounded-sm dark:text-[#8E9299] dark:hover:bg-[#1A1C21] dark:hover:text-white"
          >
            <span className="flex items-center gap-3">
              {isDarkTheme ? <Moon size={20} /> : <Sun size={20} />}
              Tema
            </span>
            <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 transition-colors dark:bg-[#F27D26]">
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                isDarkTheme ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full text-sm font-bold uppercase tracking-widest text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors rounded-sm dark:text-[#8E9299] dark:hover:bg-[#FF4444]/10 dark:hover:text-[#FF4444]"
          >
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsSidebarCollapsed(false)}
        className={cn(
          "fixed left-0 top-1/2 z-20 flex h-10 w-8 -translate-y-1/2 items-center justify-center border border-l-0 border-gray-200 bg-stone-50 text-gray-500 shadow-sm transition-all duration-300 hover:border-[#F27D26] hover:text-[#F27D26] dark:border-[#2A2D35] dark:bg-[#090A0C] dark:text-[#8E9299] dark:hover:border-[#F27D26] dark:hover:text-[#F27D26]",
          isSidebarCollapsed ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        )}
        title="Buka sidebar"
      >
        <ChevronRight size={18} />
      </button>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen overflow-x-hidden transition-all duration-300",
        isSidebarCollapsed ? "ml-0" : "ml-64"
      )}>
        <header className="h-36 p-8 flex justify-between items-start border-b border-gray-200 z-0 sticky top-0 bg-stone-50 dark:border-[#2A2D35] dark:bg-[#090A0C]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-[#F27D26] mb-1">Kontrol Inventaris</h2>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
              {pageTitles[location.pathname] || 'Inventaris'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500 dark:text-[#8E9299]">
              {pageSubtitles[location.pathname] || 'Kelola data operasional HOKY Teknik.'}
            </p>
          </div>
        </header>
        
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-8 max-w-7xl mx-auto w-full flex-1"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};
