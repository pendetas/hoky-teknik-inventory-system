import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Plus, X, Trash2, Truck } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { StorePurchaseMethod } from '../lib/types';

export const StoreSales = () => {
  const { products, storeSales, addStoreSale, deleteStoreSale } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    price: '',
    deliveryId: '',
    purchaseMethod: 'Cash' as StorePurchaseMethod,
    date: new Date().toISOString().split('T')[0],
    deadline: ''
  });

  const handleProductSelect = (productId: string) => {
    setFormData({
      ...formData,
      productId
    });
  };

  const handlePriceChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setFormData({
      ...formData,
      price: numericValue
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity || !formData.price || !formData.date) return;

    const product = products.find(p => p.id === formData.productId);
    if (product && product.stock < Number(formData.quantity)) {
      alert(`Stok tidak cukup. Tersedia: ${product.stock}`);
      return;
    }

    addStoreSale({
      productId: formData.productId,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      deliveryId: formData.deliveryId,
      purchaseMethod: formData.purchaseMethod,
      date: formData.date,
      ...(formData.purchaseMethod === 'Credit' && { deadline: formData.deadline })
    });
    
    setIsModalOpen(false);
    setFormData({
      productId: '',
      quantity: '',
      price: '',
      deliveryId: '',
      purchaseMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      deadline: ''
    });
  };

  const getProductName = (id: string) => {
    const p = products.find(p => p.id === id);
    return p ? p.name : 'Produk terhapus';
  };

  const getPaymentLabel = (method: StorePurchaseMethod) => {
    if (method === 'Cash') return 'Tunai';
    if (method === 'Transfer') return 'Transfer Bank';
    return 'Tempo';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">02 / Pengiriman Toko</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#F27D26] hover:brightness-110 text-black px-4 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all"
        >
          <Plus size={16} /> Pengiriman Baru
        </button>
      </div>

      <div className="bg-stone-50 border border-gray-200 overflow-hidden shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-900 text-[10px] uppercase tracking-widest font-bold dark:border-[#2A2D35] dark:text-[#E0E2E6]">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Produk</th>
                <th className="p-4">ID Pengiriman</th>
                <th className="p-4">Pembayaran</th>
                <th className="p-4">Info Tempo</th>
                <th className="p-4">Total Pendapatan</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#2A2D35]">
              {storeSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => (
                <tr key={sale.id} className="hover:bg-gray-100 transition-colors dark:hover:bg-[#1A1C21]">
                  <td className="p-4 text-sm font-mono text-gray-900 dark:text-[#E0E2E6]">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-[#E0E2E6]">{getProductName(sale.productId)}</p>
                    <p className="text-[10px] text-gray-900 font-mono mt-1 dark:text-[#E0E2E6]">{sale.quantity} unit @ {formatCurrency(sale.price)}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#F27D26]">
                      <Truck size={14} />
                      {sale.deliveryId || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                      sale.purchaseMethod === 'Credit' ? 'bg-[#FF4444] text-white' : 'bg-[#F27D26] text-black'
                    }`}>
                      {getPaymentLabel(sale.purchaseMethod)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-900 dark:text-[#E0E2E6]">
                    {sale.purchaseMethod === 'Credit' && sale.deadline ? (
                       <span className="text-[#FF4444] font-bold font-mono whitespace-nowrap text-xs">JATUH TEMPO: {new Date(sale.deadline).toLocaleDateString()}</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm font-bold font-mono text-gray-900 dark:text-[#E0E2E6]">
                    {formatCurrency(sale.price * sale.quantity)}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {
                        if (window.confirm('Yakin ingin menghapus data ini? Stok akan dikembalikan.')) {
                          deleteStoreSale(sale.id);
                        }
                      }}
                       className="text-[#FF4444]/60 hover:text-[#FF4444] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {storeSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">Tidak ada pengiriman toko.</td>
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
              className="bg-stone-50 border border-gray-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col text-gray-900 shadow-xl dark:bg-[#151619] dark:border-[#2A2D35] dark:text-[#E0E2E6]"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 dark:border-[#2A2D35]">
                <h3 className="text-sm font-bold uppercase italic">Pengiriman Toko Baru</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Produk</label>
                  <select 
                    required 
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.productId}
                    onChange={e => handleProductSelect(e.target.value)}
                  >
                    <option value="" disabled>Pilih produk...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Jumlah</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Estimasi Penerimaan Harga</label>
                    <input 
                      type="text" 
                      required 
                      inputMode="numeric"
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.price ? formatCurrency(Number(formData.price)) : ''}
                      onChange={e => handlePriceChange(e.target.value)}
                      placeholder="Rp0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">ID Pengiriman</label>
                  <input 
                    type="text" 
                    placeholder="XXXX (4-Digit terakhir)"
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.deliveryId}
                    onChange={e => setFormData({...formData, deliveryId: e.target.value})}
                  />
                </div>

                <div className="bg-white p-4 border border-gray-200 space-y-4 dark:bg-[#1A1C21] dark:border-[#333740]">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block tracking-widest dark:text-[#8E9299]">Metode Pembayaran</label>
                    <select 
                      className="w-full bg-stone-50 border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#090A0C] dark:border-[#333740] dark:text-white"
                      value={formData.purchaseMethod}
                      onChange={e => setFormData({...formData, purchaseMethod: e.target.value as StorePurchaseMethod})}
                    >
                      <option value="Cash">Tunai</option>
                      <option value="Transfer">Transfer Bank</option>
                      <option value="Credit">Tempo</option>
                    </select>
                  </div>

                  {formData.purchaseMethod === 'Credit' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <label className="text-[10px] uppercase font-bold text-[#FF4444] mb-1 block tracking-widest">Jatuh Tempo Pembayaran</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full bg-white border border-[#FF4444] p-2 text-sm text-[#FF4444] font-bold focus:outline-none focus:border-[#FF4444] dark:bg-[#090A0C]"
                        value={formData.deadline}
                        onChange={e => setFormData({...formData, deadline: e.target.value})}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="pt-4 flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-black text-xs uppercase tracking-tighter hover:bg-gray-100 dark:border-[#333740] dark:text-white dark:hover:bg-[#333740]"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-[#F27D26] text-black font-black py-3 text-xs uppercase tracking-tighter hover:brightness-110"
                  >
                    Simpan Pengiriman
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
