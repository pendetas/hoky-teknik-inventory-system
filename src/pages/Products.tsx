import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Product } from '../lib/types';
import { Plus, Edit2, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { formatCurrency, fileToBase64 } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stock: '',
    photoUrl: ''
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        description: product.description || '',
        stock: product.stock.toString(),
        photoUrl: product.photoUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', stock: '', photoUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
      } catch (err) {
        console.error("Error reading file", err);
        alert("Gagal memuat gambar.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.stock) return;

    try {
      if (editingId) {
        await updateProduct(editingId, {
          name: formData.name,
          description: formData.description,
          stock: Number(formData.stock),
          photoUrl: formData.photoUrl
        });
      } else {
        await addProduct({
          name: formData.name,
          description: formData.description,
          stock: Number(formData.stock),
          photoUrl: formData.photoUrl
        });
      }
      handleCloseModal();
    } catch (err) {
      alert(`Gagal menyimpan produk: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-stone-50 p-5 border border-gray-200 mb-6 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">03 / Katalog Gudang</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#F27D26] hover:brightness-110 text-black px-4 py-2 font-black text-[10px] uppercase tracking-tighter flex items-center gap-2 transition-all"
        >
          <Plus size={16} /> Tambah Produk Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-stone-50 border border-gray-200 overflow-hidden flex flex-col group shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
            <div className="aspect-square bg-gray-100 relative items-center justify-center flex overflow-hidden border-b border-gray-200 dark:bg-[#090A0C] dark:border-[#2A2D35]">
              {product.photoUrl ? (
                <img src={product.photoUrl} alt={product.name} className="object-cover w-full h-full opacity-80 group-hover:opacity-100" />
              ) : (
                <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-[#333740]">Tanpa Foto</div>
              )}
              <div className="absolute inset-0 bg-white/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 dark:bg-black/80">
                <button 
                  onClick={() => handleOpenModal(product)}
                  className="bg-[#F27D26] text-black p-2 hover:brightness-110 transition-all font-black"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Yakin ingin menghapus produk ini?')) {
                      deleteProduct(product.id).catch((err) => {
                        alert(`Gagal menghapus produk: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
                      });
                    }
                  }}
                  className="bg-[#FF4444] text-white p-2 hover:brightness-110 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider line-clamp-2 dark:text-white" title={product.name}>{product.name}</h3>
              <p className="text-gray-500 text-xs mt-1 line-clamp-2 dark:text-[#8E9299]" title={product.description}>{product.description || 'Tidak ada deskripsi'}</p>
              <div className="mt-auto pt-4 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-[#8E9299]">STOK:</span>
                <span className={`text-[10px] font-black px-2 py-1 ${product.stock < 5 ? 'bg-[#FF4444] text-white' : 'text-gray-500 dark:text-[#8E9299]'}`}>
                  {product.stock}
                </span>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full py-12 p-4 border-2 border-dashed border-gray-300 bg-stone-50 text-center dark:border-[#2A2D35] dark:bg-[#090A0C]">
            <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-bold tracking-widest dark:text-[#8E9299]">Produk tidak ditemukan. Tambahkan produk pertama Anda.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-50 border border-gray-200 w-full max-w-md overflow-hidden text-gray-900 shadow-xl dark:bg-[#151619] dark:border-[#2A2D35] dark:text-[#E0E2E6]"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center dark:border-[#2A2D35]">
                <h3 className="text-sm font-bold uppercase italic">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">Foto Produk</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 border border-gray-300 overflow-hidden flex items-center justify-center bg-white dark:border-[#333740] dark:bg-[#1A1C21]">
                      {formData.photoUrl ? (
                         <img src={formData.photoUrl} alt="Preview" className="object-cover w-full h-full" />
                      ) : (
                         <div className="text-[8px] uppercase text-gray-400 dark:text-[#333740]">Kosong</div>
                      )}
                    </div>
                    <label className="cursor-pointer bg-white hover:bg-gray-100 border border-gray-300 px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors dark:bg-[#1A1C21] dark:hover:bg-[#2A2D35] dark:border-[#333740]">
                      Unggah Gambar
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">Nama Produk</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="contoh: Bor Impact"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">Deskripsi</label>
                    <textarea 
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Deskripsi produk"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">Stok Awal</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      className="w-full bg-white border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      placeholder="0"
                    />
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
                    className="px-4 py-3 text-[10px] font-black tracking-tighter uppercase text-black bg-[#F27D26] hover:brightness-110 transition-colors"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
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
