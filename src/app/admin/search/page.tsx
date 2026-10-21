'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  Users,
  Package,
  Key,
  RefreshCw,
  LifeBuoy,
  Truck,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSearchResults = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setResults(json.data);
      } else {
        toast.error('Gagal memuat hasil pencarian');
      }
    } catch {
      toast.error('Gagal memuat hasil pencarian');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchResults(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(query.trim())}`);
      fetchSearchResults(query.trim());
    }
  };

  const getCategoryCount = (category: string) => {
    if (!results) return 0;
    switch (category) {
      case 'orders':
        return results.orders?.length || 0;
      case 'customers':
        return results.customers?.length || 0;
      case 'products':
        return results.products?.length || 0;
      case 'inventory':
        return results.inventory?.length || 0;
      case 'replacements':
        return results.replacements?.length || 0;
      case 'support':
        return results.support?.length || 0;
      case 'suppliers':
        return results.suppliers?.length || 0;
      default:
        return results.totalResults || 0;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Search Bar Input */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Search className="h-7 w-7 text-cyan-400" />
            <span>Pencarian Global Admin (Advanced Search)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pencarian cepat LINTAS ENTITAS di seluruh database toko (Pesanan, Customer, Produk, Stok Lisensi, Garansi, Tiket CS, Supplier).
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan nomor order, email customer, SKU produk, atau ID lisensi..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-cyan-500 focus:outline-none shadow-lg"
            />
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-lg"
          >
            <span>Cari Data</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      {results && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
          {[
            { id: 'all', label: 'Semua Entitas', icon: Sparkles },
            { id: 'orders', label: 'Pesanan', icon: ShoppingBag },
            { id: 'customers', label: 'Pelanggan', icon: Users },
            { id: 'products', label: 'Produk Digital', icon: Package },
            { id: 'inventory', label: 'Inventori / Stok', icon: Key },
            { id: 'replacements', label: 'Auto Replacement', icon: RefreshCw },
            { id: 'support', label: 'Tiket Support', icon: LifeBuoy },
            { id: 'suppliers', label: 'Supplier', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            const count = getCategoryCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse h-20" />
          ))}
        </div>
      ) : !results ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <Search className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Masukkan Kata Kunci Pencarian</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gunakan form pencarian di atas untuk mencari data pesanan, customer, lisensi stok, atau tiket garansi di seluruh sistem.
          </p>
        </div>
      ) : results.totalResults === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <Search className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Data Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Pencarian untuk kata kunci <strong className="text-white">"{query}"</strong> tidak menemukan data yang cocok pada entitas manapun.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Orders Section */}
          {(activeTab === 'all' || activeTab === 'orders') && results.orders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <ShoppingBag className="h-4 w-4 text-blue-400" />
                <span>Pesanan ({results.orders.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.orders.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 transition flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">{item.title}</h3>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs truncate">{item.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-cyan-300 text-sm block">{item.amount}</span>
                      <Link
                        href={item.url}
                        className="mt-1 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1"
                      >
                        <span>Buka</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Section */}
          {(activeTab === 'all' || activeTab === 'customers') && results.customers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Users className="h-4 w-4 text-teal-400" />
                <span>Pelanggan ({results.customers.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.customers.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 transition flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs min-w-0">
                      <h3 className="font-bold text-base text-white">{item.title}</h3>
                      <p className="text-slate-300 text-xs truncate">{item.subtitle}</p>
                    </div>
                    <Link
                      href={item.url}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Lihat Akun</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          {(activeTab === 'all' || activeTab === 'products') && results.products.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Package className="h-4 w-4 text-cyan-400" />
                <span>Produk Digital ({results.products.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.products.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 transition flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs min-w-0">
                      <h3 className="font-bold text-base text-white">{item.title}</h3>
                      <p className="text-slate-300 text-xs truncate">{item.subtitle}</p>
                    </div>
                    <Link
                      href={item.url}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Edit Produk</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Section */}
          {(activeTab === 'all' || activeTab === 'inventory') && results.inventory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Key className="h-4 w-4 text-emerald-400" />
                <span>Inventori Lisensi ({results.inventory.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.inventory.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 transition flex items-center justify-between gap-4">
                    <div className="space-y-1 text-xs min-w-0">
                      <h3 className="font-bold text-base text-white truncate">{item.title}</h3>
                      <p className="text-slate-300 text-xs truncate">{item.subtitle}</p>
                    </div>
                    <Link
                      href={item.url}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Periksa</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Halaman Pencarian...</div>}>
      <SearchContent />
    </Suspense>
  );
}
