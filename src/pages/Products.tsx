import React, { useMemo, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Product } from '../lib/types';
import { Plus, Edit2, Trash2, Search, ChevronDown, X, ZoomIn, ZoomOut } from 'lucide-react';
import { formatCurrency, fileToBase64 } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const productFilterOptions = [
  'matrix',
  'goodpro',
  'atmoz',
  'kishon',
  'tiger',
  'proquip',
  'maestro',
  'sumura',
  'general',
] as const;

const productGridZoomOptions = [
  { value: 'compact', label: 'Padat', minCardWidth: 170 },
  { value: 'comfortable', label: 'Normal', minCardWidth: 230 },
  { value: 'large', label: 'Besar', minCardWidth: 300 },
] as const;

const addBrandOptionValue = '__add_brand__';

type ProductGridZoom = typeof productGridZoomOptions[number]['value'];
type ProductBrand = string;

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getProductBrandFromName = (name: string, brandOptions: string[]): ProductBrand => {
  const normalizedName = name.toLowerCase();

  return brandOptions.find((option) => normalizedName.includes(option.toLowerCase())) || 'general';
};

const getProductNameWithoutBrand = (name: string, brand: ProductBrand) => {
  const brandPattern = new RegExp(`^${escapeRegExp(brand)}\\s+`, 'i');

  return name.replace(brandPattern, '').trim();
};

const buildProductName = (brand: ProductBrand, name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) return '';

  if (brand === 'general') {
    return trimmedName;
  }

  const brandPattern = new RegExp(`^${escapeRegExp(brand)}\\b`, 'i');
  if (brandPattern.test(trimmedName)) {
    return trimmedName;
  }

  return `${brand.toUpperCase()} ${trimmedName}`;
};

export const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productGroupFilter, setProductGroupFilter] = useState<'All' | ProductBrand>('All');
  const [productGridZoom, setProductGridZoom] = useState<ProductGridZoom>('comfortable');
  const [customProductBrands, setCustomProductBrands] = useState<ProductBrand[]>([]);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const [formData, setFormData] = useState({
    brand: 'general' as ProductBrand,
    name: '',
    description: '',
    stock: '',
    photoUrl: ''
  });

  const brandOptions = useMemo<string[]>(() => {
    return [...productFilterOptions, ...customProductBrands];
  }, [customProductBrands]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      const productBrand = getProductBrandFromName(product.name, brandOptions);

      setEditingId(product.id);
      setFormData({
        brand: productBrand,
        name: getProductNameWithoutBrand(product.name, productBrand),
        description: product.description || '',
        stock: product.stock.toString(),
        photoUrl: product.photoUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({ brand: 'general', name: '', description: '', stock: '', photoUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsBrandModalOpen(false);
    setEditingId(null);
    setNewBrandName('');
  };

  const handleProductGroupFilterChange = (value: string) => {
    if (value === addBrandOptionValue) {
      setIsBrandModalOpen(true);
      setNewBrandName('');
      return;
    }

    setProductGroupFilter(value as 'All' | ProductBrand);
  };

  const handleAddBrand = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedBrand = newBrandName.trim().toLowerCase();
    if (!normalizedBrand) return;

    const existingBrand = brandOptions.find((option) => option.toLowerCase() === normalizedBrand);
    if (existingBrand) {
      setProductGroupFilter(existingBrand);
      setIsBrandModalOpen(false);
      setNewBrandName('');
      return;
    }

    setCustomProductBrands((prev) => [...prev, normalizedBrand]);
    setProductGroupFilter(normalizedBrand);
    setIsBrandModalOpen(false);
    setNewBrandName('');
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
    const productName = buildProductName(formData.brand, formData.name);
    if (!productName || !formData.stock) return;

    try {
      if (editingId) {
        await updateProduct(editingId, {
          name: productName,
          description: formData.description,
          stock: Number(formData.stock),
          photoUrl: formData.photoUrl
        });
      } else {
        await addProduct({
          name: productName,
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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const normalizedName = product.name.toLowerCase();
      const matchesName = !normalizedSearch || normalizedName.includes(normalizedSearch);
      const matchesGroup = productGroupFilter === 'All' || normalizedName.includes(productGroupFilter);

      return matchesName && matchesGroup;
    });
  }, [productGroupFilter, products, searchTerm]);

  const hasActiveFilter = searchTerm || productGroupFilter !== 'All';
  const productGridZoomIndex = productGridZoomOptions.findIndex((option) => option.value === productGridZoom);
  const activeProductGridZoom = productGridZoomOptions[Math.max(productGridZoomIndex, 0)];

  const handleGridZoomChange = (direction: 'in' | 'out') => {
    setProductGridZoom((currentZoom) => {
      const currentIndex = productGridZoomOptions.findIndex((option) => option.value === currentZoom);
      const nextIndex = direction === 'in' ? currentIndex + 1 : currentIndex - 1;
      const boundedIndex = Math.min(Math.max(nextIndex, 0), productGridZoomOptions.length - 1);

      return productGridZoomOptions[boundedIndex].value;
    });
  };

  const formatLastUpdate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 border border-gray-200 p-5 shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-[#2A2D35] md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase italic text-gray-900 dark:text-[#E0E2E6]">03 / Katalog Gudang</h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                {filteredProducts.length} dari {products.length} produk ditampilkan
              </p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-[#F27D26] hover:brightness-110 text-black px-4 py-3 font-black text-[10px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} /> Tambah Produk Baru
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.9fr_auto] xl:grid-cols-[1.4fr_0.9fr_auto_auto]">
            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Cari Nama Produk</span>
              <div className="mt-1 flex h-10 items-center gap-2 border-[0.5px] border-gray-300 bg-white px-3 transition-colors focus-within:border-[#F97316] dark:border-[#333] dark:bg-[#111]">
                <Search size={15} className="text-gray-500 dark:text-[#A0A0A0]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari berdasarkan nama..."
                  className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#A0A0A0] dark:placeholder:text-[#555]"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Jenis Produk</span>
              <div className="relative mt-1">
                <select
                  value={productGroupFilter}
                  onChange={(event) => handleProductGroupFilterChange(event.target.value)}
                  className="h-10 w-full appearance-none border-[0.5px] border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-[#F97316] dark:border-[#333] dark:bg-[#111] dark:text-[#A0A0A0]"
                >
                  <option value="All">Semua Produk</option>
                  {productFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                  <option value={addBrandOptionValue}>+ Tambah Brand Baru</option>
                  {customProductBrands.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#A0A0A0]" />
              </div>
            </label>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-[#8E9299]">Zoom Grid</span>
              <div className="mt-1 flex h-10 items-center border-[0.5px] border-gray-300 bg-white dark:border-[#333] dark:bg-[#111]">
                <button
                  type="button"
                  onClick={() => handleGridZoomChange('out')}
                  disabled={productGridZoomIndex <= 0}
                  title="Zoom out"
                  aria-label="Zoom out tampilan produk"
                  className="flex h-full w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#A0A0A0] dark:hover:bg-[#1A1C21]"
                >
                  <ZoomOut size={15} />
                </button>
                <div className="flex h-full min-w-20 items-center justify-center border-x border-gray-200 px-3 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:border-[#333] dark:text-[#A0A0A0]">
                  {activeProductGridZoom.label}
                </div>
                <button
                  type="button"
                  onClick={() => handleGridZoomChange('in')}
                  disabled={productGridZoomIndex >= productGridZoomOptions.length - 1}
                  title="Zoom in"
                  aria-label="Zoom in tampilan produk"
                  className="flex h-full w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#A0A0A0] dark:hover:bg-[#1A1C21]"
                >
                  <ZoomIn size={15} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setProductGroupFilter('All');
              }}
              disabled={!hasActiveFilter}
              className="h-10 self-end border-[0.5px] border-[#F97316] bg-transparent px-4 text-[10px] font-black uppercase tracking-tighter text-[#F97316] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[rgba(249,115,22,0.08)]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-stone-50/60 p-3 dark:border-[#2A2D35] dark:bg-[#090A0C]/70">
        <div
          className="min-h-80 overflow-auto pr-1"
          style={{ maxHeight: 'calc(100vh - 22rem)' }}
        >
          <div
            className="grid gap-4 pb-1"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${activeProductGridZoom.minCardWidth}px), 1fr))` }}
          >
            {filteredProducts.map(product => (
              <div key={product.id} className="min-w-0 bg-stone-50 border border-gray-200 overflow-hidden flex flex-col group shadow-sm dark:bg-[#151619] dark:border-[#2A2D35]">
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
                  <h3 className="text-sm font-bold leading-snug text-gray-950 line-clamp-2 dark:text-white" title={product.name}>{product.name}</h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2 dark:text-[#8E9299]" title={product.description}>{product.description || 'Tidak ada deskripsi'}</p>
                  <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-3 border-t border-gray-200 pt-3 dark:border-[#2A2D35]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-[#8E9299]">Stok</span>
                      <span className={`font-mono text-2xl font-black leading-none ${product.stock < 5 ? 'text-[#FF4444]' : 'text-gray-950 dark:text-white'}`}>
                      {product.stock}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-[#666]">
                      <span>Last Update</span>
                      <span className="font-mono text-gray-600 dark:text-[#A0A0A0]">{formatLastUpdate(product.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 p-4 border-2 border-dashed border-gray-300 bg-stone-50 text-center dark:border-[#2A2D35] dark:bg-[#090A0C]">
                <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-bold tracking-widest dark:text-[#8E9299]">
                  {hasActiveFilter ? 'Tidak ada produk yang cocok dengan filter.' : 'Produk tidak ditemukan. Tambahkan produk pertama Anda.'}
                </p>
              </div>
            )}
          </div>
        </div>
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
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest dark:text-[#8E9299]">Brand Produk</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full appearance-none bg-white border border-gray-300 p-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:bg-[#1A1C21] dark:border-[#333740] dark:text-white"
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                    >
                      {brandOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 dark:text-[#A0A0A0]" />
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

      <AnimatePresence>
        {isBrandModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm border border-gray-200 bg-stone-50 text-gray-900 shadow-xl dark:border-[#2A2D35] dark:bg-[#151619] dark:text-[#E0E2E6]"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-[#2A2D35]">
                <h3 className="text-sm font-bold uppercase italic">Tambah Brand Baru</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsBrandModalOpen(false);
                    setNewBrandName('');
                  }}
                  className="text-gray-500 hover:text-gray-950 dark:text-[#8E9299] dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddBrand} className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E9299]">
                    Nama Brand
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:outline-none focus:border-[#F27D26] dark:border-[#333740] dark:bg-[#1A1C21] dark:text-white"
                    value={newBrandName}
                    onChange={(event) => setNewBrandName(event.target.value)}
                    placeholder="contoh: Makita"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBrandModalOpen(false);
                      setNewBrandName('');
                    }}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-gray-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-[#333740]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-[#F27D26] px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-black transition-colors hover:brightness-110"
                  >
                    Tambah Brand
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
