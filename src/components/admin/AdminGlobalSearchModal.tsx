'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  ShoppingBag,
  Users,
  Package,
  Key,
  RefreshCw,
  LifeBuoy,
  Truck,
  ChevronRight,
  Sparkles,
  Command,
} from 'lucide-react';

interface GlobalSearchResultGroup {
  orders: any[];
  customers: any[];
  products: any[];
  inventory: any[];
  replacements: any[];
  support: any[];
  suppliers: any[];
  totalResults: number;
}

export function AdminGlobalSearchModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [results, setResults] = useState<GlobalSearchResultGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search fetch
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setResults(json.data);
        }
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (url: string) => {
    setIsOpen(false);
    router.push(url);
  };

  const handleViewAllResults = () => {
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`/admin/search?q=${encodeURIComponent(query.trim())}`);
  };

  const getAllFlattenedItems = () => {
    if (!results) return [];
    let items: any[] = [];
    if (activeTab === 'all' || activeTab === 'orders') items = items.concat(results.orders || []);
    if (activeTab === 'all' || activeTab === 'customers') items = items.concat(results.customers || []);
    if (activeTab === 'all' || activeTab === 'products') items = items.concat(results.products || []);
    if (activeTab === 'all' || activeTab === 'inventory') items = items.concat(results.inventory || []);
    if (activeTab === 'all' || activeTab === 'replacements') items = items.concat(results.replacements || []);
    if (activeTab === 'all' || activeTab === 'support') items = items.concat(results.support || []);
    if (activeTab === 'all' || activeTab === 'suppliers') items = items.concat(results.suppliers || []);
    return items;
  };

  return (
    <>
      {/* Search Bar Trigger Button in Admin Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition w-48 sm:w-64 md:w-80 justify-between group"
      >
        <span className="flex items-center gap-2 text-xs truncate">
          <Search className="h-4 w-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">Cari pesanan, user, stok...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold shrink-0">
          <Command className="h-3 w-3" /> K
        </kbd>
      </button>

      {/* Global Search Popover Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl rounded-3xl glass-panel border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden space-y-0 text-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
              <Search className="h-5 w-5 text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik kata kunci (No Order, Nama User, Email, Produk, SKU, Tiket Support)..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-bold shrink-0"
              >
                ESC
              </button>
            </div>

            {/* Filter Tabs */}
            {results && results.totalResults > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                    activeTab === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({results.totalResults})
                </button>
                {results.orders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                      activeTab === 'orders' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pesanan ({results.orders.length})
                  </button>
                )}
                {results.customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('customers')}
                    className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                      activeTab === 'customers' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pelanggan ({results.customers.length})
                  </button>
                )}
                {results.products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                      activeTab === 'products' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Produk ({results.products.length})
                  </button>
                )}
                {results.inventory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                      activeTab === 'inventory' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inventori ({results.inventory.length})
                  </button>
                )}
              </div>
            )}

            {/* Results Content Area */}
            <div className="p-4 overflow-y-auto space-y-6 flex-1 text-xs">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto" />
                  <p className="font-medium">Mencari di seluruh database toko...</p>
                </div>
              ) : !query.trim() ? (
                <div className="p-8 text-center space-y-3">
                  <Search className="h-10 w-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Advanced Admin Global Search</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Ketik nomor pesanan (ORD-...), nama customer, email, nama produk, lisensi, atau tiket bantuan untuk melihat hasil instan.
                  </p>
                </div>
              ) : results && results.totalResults === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-slate-300 font-bold text-sm">Tidak ada data ditemukan untuk "{query}"</p>
                  <p className="text-xs text-slate-400">Coba gunakan kata kunci nomor order, email, atau SKU lainnya.</p>
                </div>
              ) : results ? (
                <div className="space-y-4">
                  {/* Orders */}
                  {(activeTab === 'all' || activeTab === 'orders') && results.orders.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <ShoppingBag className="h-3.5 w-3.5 text-blue-400" />
                        <span>Pesanan ({results.orders.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {results.orders.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectResult(item.url)}
                            className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{item.title}</p>
                              <p className="text-slate-400 text-xs">{item.subtitle}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-cyan-300">{item.amount}</span>
                              <span className="block text-[10px] text-slate-500 uppercase">{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {(activeTab === 'all' || activeTab === 'customers') && results.customers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <Users className="h-3.5 w-3.5 text-teal-400" />
                        <span>Pelanggan ({results.customers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {results.customers.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectResult(item.url)}
                            className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{item.title}</p>
                              <p className="text-slate-400 text-xs">{item.subtitle}</p>
                            </div>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {(activeTab === 'all' || activeTab === 'products') && results.products.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <Package className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Produk Digital ({results.products.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {results.products.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectResult(item.url)}
                            className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{item.title}</p>
                              <p className="text-slate-400 text-xs">{item.subtitle}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                              {item.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inventory */}
                  {(activeTab === 'all' || activeTab === 'inventory') && results.inventory.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <Key className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Inventori Lisensi ({results.inventory.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {results.inventory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectResult(item.url)}
                            className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{item.title}</p>
                              <p className="text-slate-400 text-xs">{item.subtitle}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[10px]">
                              {item.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {results && results.totalResults > 0 && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
                <span className="text-slate-400 text-[11px]">
                  Menampilkan hasil teratas untuk <strong className="text-white">"{query}"</strong>
                </span>

                <button
                  type="button"
                  onClick={handleViewAllResults}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1"
                >
                  <span>Lihat Semua Hasil</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
