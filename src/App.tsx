/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './store/InventoryContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { ShopeeSales } from './pages/ShopeeSales';
import { ShopeeReturns } from './pages/ShopeeReturns';
import { ShopeeReports } from './pages/ShopeeReports';
import { StoreSales } from './pages/StoreSales';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { supabase } from './lib/supabaseClient';

const THEME_STORAGE_KEY = 'hoky-teknik-theme';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const shouldUseDarkTheme = savedTheme ? savedTheme === 'dark' : true;
    document.documentElement.classList.toggle('dark', shouldUseDarkTheme);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 text-gray-500 dark:bg-[#0F1115] dark:text-[#8E9299] flex items-center justify-center font-sans">
        <span className="text-[10px] uppercase font-bold tracking-widest">Memuat sistem inventaris...</span>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <InventoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="shopee-sales" element={<ShopeeSales />} />
            <Route path="shopee-returns" element={<ShopeeReturns />} />
            <Route path="store-sales" element={<StoreSales />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/shopee" element={<ShopeeReports />} />
            <Route path="reports/store" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InventoryProvider>
  );
}
