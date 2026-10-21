'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Package,
  Plus,
  Trash2,
  HelpCircle,
  ImageIcon,
  DollarSign,
  RefreshCw,
  Sliders,
  Clock,
  Coins,
  Upload,
  Loader2,
  BookOpen,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { uploadToCloudinaryDirect } from '@/lib/cloudinary-client';
import { RichMarkdownEditor } from '@/components/admin/RichMarkdownEditor';

interface VariantState {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  defaultCostAmount?: string;
  deliveryType: string;
  warrantyDays: string;
  subscriptionDays: string;
  replacementEnabled: boolean;
  replacementMode: string;
  replacementCooldownHours: string;
  replacementMaxCount: string;
  replacementValidityType: string;
  replacementValidityDays: string;
  replacementRequiresReason: boolean;
  replacementAllowWhenOutOfStockQueue: boolean;
  credentialExpirationEnabled?: boolean;
  credentialDeliveryValidityHours?: string;
  subscriptionStartPolicy?: string;
  coinEarningMode?: string;
  coinRedemptionMode?: string;
  coinFullPaymentAllowed?: boolean;
  deliveryModel?: string;
  sharedCapacityDefault?: string;
  sharedSlotLabelPrefix?: string;
  sharedSafetyBufferDays?: string;
  sharedRequireMasterLifetimeCheck?: boolean;
  sharedAllowSlotReuseAfterExpiration?: boolean;
  sharedAllowMassReplacement?: boolean;
  sharedExposeMasterCredentialToCustomer?: boolean;
  sharedExposeSlotPin?: boolean;
  usesProfile?: boolean;
  usesProfilePin?: boolean;
  availableStock?: number;
}

interface AdminEditProductClientProps {
  product: any;
  categories: any[];
}

export function AdminEditProductClient({ product, categories }: AdminEditProductClientProps) {
  const router = useRouter();

  const [name, setName] = useState(product.name || '');
  const [sku, setSku] = useState(product.sku || '');
  const [categoryId, setCategoryId] = useState(product.categoryId || categories[0]?.id || '');
  const [shortDesc, setShortDesc] = useState(product.shortDesc || '');
  const [fullDesc, setFullDesc] = useState(product.fullDesc || '');
  
  // Image 1: Logo App (Thumbnail)
  const [thumbnail, setThumbnail] = useState(product.thumbnail || '');

  // Image 2+: Gambar Deskripsi / Banner Gallery (Multiple)
  const [gallery, setGallery] = useState<string[]>(
    product.gallery && product.gallery.length > 0 ? product.gallery : ['']
  );

  const [status, setStatus] = useState(product.status || 'ACTIVE');
  const [featured, setFeatured] = useState(product.featured || false);
  const [bestSeller, setBestSeller] = useState(product.bestSeller || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Customer Guide States
  const [tutorialContent, setTutorialContent] = useState(product.tutorialContent || '');
  const [termsContent, setTermsContent] = useState(product.termsContent || '');
  const [importantNotes, setImportantNotes] = useState(product.importantNotes || '');
  const [guideVersion, setGuideVersion] = useState(String(product.guideVersion || 1));
  const [showGuideAfterDelivery, setShowGuideAfterDelivery] = useState(Boolean(product.showGuideAfterDelivery));
  const [requireGuideAcknowledgement, setRequireGuideAcknowledgement] = useState(Boolean(product.requireGuideAcknowledgement));

  // Product Variants State
  const [variants, setVariants] = useState<VariantState[]>(
    product.variants && product.variants.length > 0
      ? product.variants.map((v: any) => ({
          id: v.id,
          name: v.name || '',
          sku: v.sku || '',
          price: v.price ? String(v.price) : '0',
          compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : '',
          cost: v.cost ? String(v.cost) : (v.defaultCostAmount ? String(v.defaultCostAmount) : ''),
          defaultCostAmount: v.defaultCostAmount ? String(v.defaultCostAmount) : (v.cost ? String(v.cost) : ''),
          deliveryType: v.deliveryType || 'LICENSE_KEY',
          warrantyDays: v.warrantyDays ? String(v.warrantyDays) : '30',
          subscriptionDays: v.subscriptionDays ? String(v.subscriptionDays) : '30',
          replacementEnabled: Boolean(v.replacementEnabled),
          replacementMode: v.replacementMode || 'AUTO',
          replacementCooldownHours: v.replacementCooldownHours ? String(v.replacementCooldownHours) : '72',
          replacementMaxCount: v.replacementMaxCount ? String(v.replacementMaxCount) : '',
          replacementValidityType: v.replacementValidityType || 'SUBSCRIPTION',
          replacementValidityDays: v.replacementValidityDays ? String(v.replacementValidityDays) : '30',
          replacementRequiresReason: Boolean(v.replacementRequiresReason),
          replacementAllowWhenOutOfStockQueue: v.replacementAllowWhenOutOfStockQueue ?? true,
          credentialExpirationEnabled: Boolean(v.credentialExpirationEnabled),
          credentialDeliveryValidityHours: v.credentialDeliveryValidityHours ? String(v.credentialDeliveryValidityHours) : '72',
          subscriptionStartPolicy: v.subscriptionStartPolicy || 'ON_FULFILLMENT',
          coinEarningMode: v.coinEarningMode || 'USE_GLOBAL',
          coinRedemptionMode: v.coinRedemptionMode || 'USE_GLOBAL',
          coinFullPaymentAllowed: Boolean(v.coinFullPaymentAllowed),
          deliveryModel: v.deliveryModel || 'DEDICATED_ACCOUNT',
          sharedCapacityDefault: v.sharedCapacityDefault ? String(v.sharedCapacityDefault) : '2',
          sharedSlotLabelPrefix: v.sharedSlotLabelPrefix || 'USER',
          sharedSafetyBufferDays: v.sharedSafetyBufferDays ? String(v.sharedSafetyBufferDays) : '2',
          sharedRequireMasterLifetimeCheck: v.sharedRequireMasterLifetimeCheck !== false,
          sharedAllowSlotReuseAfterExpiration: Boolean(v.sharedAllowSlotReuseAfterExpiration),
          sharedAllowMassReplacement: v.sharedAllowMassReplacement !== false,
          sharedExposeMasterCredentialToCustomer: v.sharedExposeMasterCredentialToCustomer !== false,
          sharedExposeSlotPin: v.sharedExposeSlotPin !== false,
          usesProfile: v.usesProfile !== false,
          usesProfilePin: v.usesProfilePin !== false,
          availableStock: v.availableStock ?? v.availableStockCount ?? 0,
        }))
      : [
          {
            name: 'Standard License',
            sku: `${product.sku || 'SKU'}-V1`,
            price: '50000',
            compareAtPrice: '100000',
            cost: '',
            deliveryType: 'LICENSE_KEY',
            warrantyDays: '30',
            subscriptionDays: '30',
            replacementEnabled: false,
            replacementMode: 'AUTO',
            replacementCooldownHours: '72',
            replacementMaxCount: '',
            replacementValidityType: 'SUBSCRIPTION',
            replacementValidityDays: '30',
            replacementRequiresReason: false,
            replacementAllowWhenOutOfStockQueue: true,
            credentialExpirationEnabled: false,
            credentialDeliveryValidityHours: '72',
            subscriptionStartPolicy: 'ON_FULFILLMENT',
          },
        ]
  );

  // FAQs state
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>(
    product.faqs && product.faqs.length > 0
      ? product.faqs.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer }))
      : [{ id: '1', question: '', answer: '' }]
  );

  // Variant methods
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        name: `Varian #${prev.length + 1}`,
        sku: `${sku || 'SKU'}-V${prev.length + 1}`,
        price: '50000',
        compareAtPrice: '',
        cost: '',
        deliveryType: 'ACCOUNT',
        warrantyDays: '30',
        subscriptionDays: '30',
        replacementEnabled: true,
        replacementMode: 'AUTO',
        replacementCooldownHours: '72',
        replacementMaxCount: '',
        replacementValidityType: 'SUBSCRIPTION',
        replacementValidityDays: '30',
        replacementRequiresReason: true,
        replacementAllowWhenOutOfStockQueue: true,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.error('Produk harus memiliki minimal 1 varian');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantState, value: any) => {
    setVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<number | null>(null);

  // Gallery methods
  const addGalleryImage = () => {
    setGallery((prev) => [...prev, '']);
  };

  const removeGalleryImage = (index: number) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGalleryImage = (index: number, url: string) => {
    setGallery((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  };

  const handleGalleryUpload = async (index: number, file: File) => {
    setUploadingGalleryIndex(index);
    try {
      const result = await uploadToCloudinaryDirect(file, {
        purpose: 'PRODUCT',
        subfolder: `gallery_${product.id || 'general'}`,
      });
      updateGalleryImage(index, result.secureUrl || result.url);
      toast.success('Gambar banner berhasil diunggah ke Cloudinary!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah gambar ke Cloudinary');
    } finally {
      setUploadingGalleryIndex(null);
    }
  };

  const handleBulkGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    toast.info(`Mengunggah ${files.length} gambar ke Cloudinary...`);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadToCloudinaryDirect(file, {
          purpose: 'PRODUCT',
          subfolder: `gallery_${product.id || 'general'}`,
        });
        if (result.secureUrl || result.url) {
          setGallery((prev) => [...prev.filter((u) => u.trim() !== ''), result.secureUrl || result.url]);
        }
      } catch (err) {
        console.error('Error uploading file to Cloudinary:', err);
      }
    }
    toast.success('Semua gambar berhasil diunggah ke Cloudinary!');
  };

  // FAQ methods
  const addFaqItem = () => {
    setFaqs((prev) => [...prev, { id: Date.now().toString(), question: '', answer: '' }]);
  };

  const removeFaqItem = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFaqItem = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !categoryId) {
      toast.error('Nama produk, SKU, dan Kategori wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          categoryId,
          shortDesc: shortDesc.trim(),
          fullDesc: fullDesc.trim(),
          thumbnail: thumbnail.trim(),
          gallery: gallery.map((g) => g.trim()).filter(Boolean),
          status,
          featured,
          bestSeller,
          variants,
          faqs,
          tutorialContent: tutorialContent.trim() || null,
          termsContent: termsContent.trim() || null,
          importantNotes: importantNotes.trim() || null,
          guideVersion: parseInt(guideVersion, 10) || 1,
          showGuideAfterDelivery,
          requireGuideAcknowledgement,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Produk & varian berhasil diperbarui!');
        router.push('/admin/products');
        router.refresh();
      } else {
        toast.error(json.error || 'Gagal memperbarui produk');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Produk berhasil dihapus');
        router.push('/admin/products');
        router.refresh();
      } else {
        toast.error(json.error || 'Gagal menghapus produk');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              <span>Edit Produk: {product.name}</span>
            </h1>
            <p className="text-xs text-slate-400">Atur Informasi Produk, Logo App, Banner Preview, Varian Harga, & Auto Replacement.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>{isDeleting ? 'Hapus...' : 'Hapus Produk'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6 text-xs">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="font-extrabold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-400" />
            <span>Informasi Produk</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Nama Produk *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">SKU Induk Produk *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Kategori *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Status Publikasi Produk</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ACTIVE">ACTIVE (Aktif Tampil di Toko)</option>
                <option value="DRAFT">DRAFT (Simpan Sebagai Draf)</option>
                <option value="INACTIVE">INACTIVE (Nonaktifkan)</option>
              </select>
            </div>
          </div>

          {/* Badges Toggle */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500"
              />
              <span className="text-xs font-bold text-slate-300">Featured (Tampil di Produk Pilihan)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bestSeller}
                onChange={(e) => setBestSeller(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              <span className="text-xs font-bold text-slate-300">Best Seller (Tampil di Terlaris / Top Charts)</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Deskripsi Singkat *</label>
            <input
              type="text"
              required
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Deskripsi Lengkap & Fitur *</label>
            <textarea
              rows={4}
              required
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Product Images Section: Logo & Gallery Description Images */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h2 className="font-extrabold text-white text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-cyan-400" />
            <span>Manajemen Gambar Produk (Logo & Deskripsi)</span>
          </h2>

          {/* 1. Logo App (Thumbnail) */}
          <ImageUploadField
            label="Gambar 1: Logo App / Icon (Thumbnail Squircle)"
            sublabel="Logo persegi/squircle yang tampil di kartu produk PlayStore dan header atas halaman detail."
            value={thumbnail}
            onChange={setThumbnail}
            placeholder="URL Logo App atau Klik 'Pilih File'"
            folder="products"
            aspectHint="1:1 (Square)"
          />

          {/* 2. Gambar Deskripsi (Gallery Images) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="font-extrabold text-white text-xs block">
                  Gambar 2+: Gambar Deskripsi & Preview Slider (Bisa Lebih Dari 1)
                </label>
                <p className="text-[10px] text-slate-400">
                  Banner / screenshot deskripsi produk yang akan ditampilkan di slider preview.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1 text-[11px] font-bold transition cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>+ Upload File Banner</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBulkGalleryUpload(e.target.files)}
                  />
                </label>
                <button
                  type="button"
                  onClick={addGalleryImage}
                  className="flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1 text-[11px] font-bold transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Input URL</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {gallery.map((imgUrl, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500 font-bold w-6">#{index + 1}</span>
                  <input
                    type="text"
                    placeholder={`URL Gambar Deskripsi #${index + 1} atau Klik Upload`}
                    value={imgUrl}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <label className="flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-2 text-xs font-semibold cursor-pointer shrink-0 transition">
                    {uploadingGalleryIndex === index ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-cyan-400" />
                    )}
                    <span className="text-[11px]">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGalleryUpload(index, file);
                      }}
                    />
                  </label>
                  <div className="h-9 w-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={`Deskripsi ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-600 font-bold">Preview</span>
                    )}
                  </div>
                  {gallery.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="p-2 text-slate-500 hover:text-rose-400"
                      title="Hapus gambar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Variants & Replacement Settings Section */}
        <div className="space-y-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-white text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                <span>Manajemen Varian Harga & Auto Replacement Settings</span>
              </h2>
              <p className="text-[10px] text-slate-400">Atur varian produk, tipe pengiriman, harga jual, garansi, serta fitur Auto Replacement.</p>
            </div>

            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold transition"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Varian Baru</span>
            </button>
          </div>

          <div className="space-y-6">
            {variants.map((v, vIndex) => (
              <div key={vIndex} className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 space-y-4 relative">
                
                {/* Variant Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                      Varian #{vIndex + 1}
                    </span>
                    <span className="font-bold text-white text-xs">{v.name || 'Nama Varian'}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                        (v.availableStock || 0) > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {(v.availableStock || 0) > 0 ? `Stok Ready: ${v.availableStock} item` : 'Stok: 0 (Kosong)'}
                    </span>
                  </div>

                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(vIndex)}
                      className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Varian</span>
                    </button>
                  )}
                </div>

                {/* Variant Basic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Nama Varian *</label>
                    <input
                      type="text"
                      required
                      value={v.name}
                      onChange={(e) => updateVariant(vIndex, 'name', e.target.value)}
                      placeholder="e.g. 1 Bulan Private / 1 Tahun License"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">SKU Varian *</label>
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => updateVariant(vIndex, 'sku', e.target.value)}
                      placeholder="e.g. ADB-1M-PRIV"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Harga Jual (Rp) *</label>
                    <input
                      type="number"
                      required
                      value={v.price}
                      onChange={(e) => updateVariant(vIndex, 'price', e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Harga Coret (Rp)</label>
                    <input
                      type="number"
                      value={v.compareAtPrice}
                      onChange={(e) => updateVariant(vIndex, 'compareAtPrice', e.target.value)}
                      placeholder="Harga diskon"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Harga Modal / COGS (Rp)</label>
                    <input
                      type="number"
                      value={v.defaultCostAmount || v.cost || 0}
                      onChange={(e) => updateVariant(vIndex, 'defaultCostAmount', e.target.value)}
                      placeholder="Estimasi biaya modal"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Delivery Model (Model Alokasi)</label>
                    <select
                      value={v.deliveryModel || 'DEDICATED_ACCOUNT'}
                      onChange={(e) => updateVariant(vIndex, 'deliveryModel', e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                    >
                      <option value="DEDICATED_ACCOUNT">DEDICATED_ACCOUNT (1 Akun = 1 Customer)</option>
                      <option value="SHARED_ACCOUNT">SHARED_ACCOUNT (1 Akun Master = N Customer Slots)</option>
                      <option value="FAMILY_MEMBER">FAMILY_MEMBER (1 Family Owner = N Member Emails)</option>
                      <option value="LICENSE_KEY">LICENSE_KEY (Serial / Kode Lisensi)</option>
                      <option value="DOWNLOAD">DOWNLOAD (File Unduhan Digital)</option>
                      <option value="MANUAL">MANUAL (Fulfillment Manual CS)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Durasi Langganan (Hari)</label>
                    <input
                      type="number"
                      value={v.subscriptionDays}
                      onChange={(e) => updateVariant(vIndex, 'subscriptionDays', e.target.value)}
                      placeholder="30"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Garansi (Hari)</label>
                    <input
                      type="number"
                      value={v.warrantyDays}
                      onChange={(e) => updateVariant(vIndex, 'warrantyDays', e.target.value)}
                      placeholder="30"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* CONDITIONAL SHARED / FAMILY ACCOUNT SETTINGS UI */}
                {(v.deliveryModel === 'SHARED_ACCOUNT' || v.deliveryModel === 'FAMILY_MEMBER') && (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Sliders className="h-4 w-4 text-cyan-400" />
                      <span className="font-extrabold text-white text-xs">
                        PENGATURAN {v.deliveryModel === 'SHARED_ACCOUNT' ? 'SHARED ACCOUNT' : 'FAMILY MEMBER'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 text-[11px] block">
                          Default Kapasitas Slot ({v.deliveryModel === 'SHARED_ACCOUNT' ? 'maxSlots' : 'maxMembers'})
                        </label>
                        <input
                          type="number"
                          value={v.sharedCapacityDefault || '2'}
                          onChange={(e) => updateVariant(vIndex, 'sharedCapacityDefault', e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 text-[11px] block">Prefix Label Slot</label>
                        <input
                          type="text"
                          value={v.sharedSlotLabelPrefix || 'USER'}
                          onChange={(e) => updateVariant(vIndex, 'sharedSlotLabelPrefix', e.target.value)}
                          placeholder="e.g. USER / PROFILE"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 text-[11px] block">Safety Buffer Lifetime (Hari)</label>
                        <input
                          type="number"
                          value={v.sharedSafetyBufferDays || '2'}
                          onChange={(e) => updateVariant(vIndex, 'sharedSafetyBufferDays', e.target.value)}
                          placeholder="2"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.sharedRequireMasterLifetimeCheck)}
                          onChange={(e) => updateVariant(vIndex, 'sharedRequireMasterLifetimeCheck', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Cek Sisa Expiry Master Account (Require Master Lifetime)</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.sharedAllowMassReplacement)}
                          onChange={(e) => updateVariant(vIndex, 'sharedAllowMassReplacement', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Izinkan Mass Replacement Otomatis Saat Master Invalid</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.usesProfile)}
                          onChange={(e) => updateVariant(vIndex, 'usesProfile', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Gunakan Profile per Slot (Contoh: Netflix / CapCut)</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.usesProfilePin)}
                          onChange={(e) => updateVariant(vIndex, 'usesProfilePin', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Wajibkan PIN per Profile</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.sharedExposeMasterCredentialToCustomer)}
                          onChange={(e) => updateVariant(vIndex, 'sharedExposeMasterCredentialToCustomer', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Tampilkan Kredensial Master Account ke Dashboard Customer</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(v.sharedExposeSlotPin)}
                          onChange={(e) => updateVariant(vIndex, 'sharedExposeSlotPin', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                        />
                        <span>Tampilkan PIN Slot / Profile ke Customer</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Auto Replacement Settings UI per Variant */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-cyan-400" />
                      <span className="font-extrabold text-white text-xs">AUTO REPLACEMENT SETTINGS (Varian Ini)</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.replacementEnabled}
                        onChange={(e) => updateVariant(vIndex, 'replacementEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      <span className="ml-2 text-xs font-bold text-slate-200">
                        {v.replacementEnabled ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  {v.replacementEnabled && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Mode Replacement</label>
                          <select
                            value={v.replacementMode}
                            onChange={(e) => updateVariant(vIndex, 'replacementMode', e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="AUTO">Automatic (Otomatis Instan)</option>
                            <option value="MANUAL_APPROVAL">Manual Approval (Persetujuan Admin)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Cooldown (Jam)</label>
                          <input
                            type="number"
                            value={v.replacementCooldownHours}
                            onChange={(e) => updateVariant(vIndex, 'replacementCooldownHours', e.target.value)}
                            placeholder="72"
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Max Replacement</label>
                          <input
                            type="number"
                            value={v.replacementMaxCount}
                            onChange={(e) => updateVariant(vIndex, 'replacementMaxCount', e.target.value)}
                            placeholder="Kosongkan = Unlimited"
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Masa Berlaku Proteksi (Validity)</label>
                          <select
                            value={v.replacementValidityType}
                            onChange={(e) => updateVariant(vIndex, 'replacementValidityType', e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="SUBSCRIPTION">Subscription Expired (Selama Langganan)</option>
                            <option value="WARRANTY">Warranty Expired (Selama Garansi)</option>
                            <option value="CUSTOM_DAYS">Custom Days (Jumlah Hari)</option>
                          </select>
                        </div>

                        {v.replacementValidityType === 'CUSTOM_DAYS' && (
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300 text-[11px] block">Custom Days (Hari)</label>
                            <input
                              type="number"
                              value={v.replacementValidityDays}
                              onChange={(e) => updateVariant(vIndex, 'replacementValidityDays', e.target.value)}
                              placeholder="30"
                              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={v.replacementRequiresReason}
                            onChange={(e) => updateVariant(vIndex, 'replacementRequiresReason', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-800 text-emerald-500"
                          />
                          <span className="text-[11px] text-slate-300">Wajibkan Alasan Kendala</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={v.replacementAllowWhenOutOfStockQueue}
                            onChange={(e) => updateVariant(vIndex, 'replacementAllowWhenOutOfStockQueue', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-800 text-emerald-500"
                          />
                          <span className="text-[11px] text-slate-300">Izinkan Antrean Saat Stok Habis</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Credential Expiration Settings UI per Variant */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className="font-extrabold text-white text-xs">CREDENTIAL EXPIRATION (DELIVERY DEADLINE)</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.credentialExpirationEnabled || false}
                        onChange={(e) => updateVariant(vIndex, 'credentialExpirationEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ml-2 text-xs font-bold text-slate-200">
                        {v.credentialExpirationEnabled ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  {v.credentialExpirationEnabled && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Delivery Validity (Jam / Hours)</label>
                          <input
                            type="number"
                            value={v.credentialDeliveryValidityHours || 72}
                            onChange={(e) => updateVariant(vIndex, 'credentialDeliveryValidityHours', e.target.value)}
                            placeholder="72 (Misal: 72 Jam = 3 Hari)"
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                          <span className="text-[10px] text-slate-500">Stok yang belum dikirim dalam waktu ini akan otomatis menjadi EXPIRED.</span>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 text-[11px] block">Awal Subscription Customer</label>
                          <select
                            value={v.subscriptionStartPolicy || 'ON_FULFILLMENT'}
                            onChange={(e) => updateVariant(vIndex, 'subscriptionStartPolicy', e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="ON_FULFILLMENT">ON_FULFILLMENT (Mulai saat credential dikirim)</option>
                            <option value="ON_PAYMENT">ON_PAYMENT (Mulai saat pembayaran sukses)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loyalty Coin Rules Override UI per Variant */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span className="font-extrabold text-white text-xs">LOYALTY COIN RULES OVERRIDE (Varian Ini)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 text-[11px] block">Mode Earning Cashback</label>
                      <select
                        value={v.coinEarningMode || 'USE_GLOBAL'}
                        onChange={(e) => updateVariant(vIndex, 'coinEarningMode', e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="USE_GLOBAL">USE_GLOBAL (Default Global 2%)</option>
                        <option value="CUSTOM">CUSTOM (Persentase Custom)</option>
                        <option value="DISABLED">DISABLED (Tanpa Coin Reward)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 text-[11px] block">Mode Penukaran (Redemption)</label>
                      <select
                        value={v.coinRedemptionMode || 'USE_GLOBAL'}
                        onChange={(e) => updateVariant(vIndex, 'coinRedemptionMode', e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="USE_GLOBAL">USE_GLOBAL (Default Global Max 30%)</option>
                        <option value="CUSTOM">CUSTOM (Max Diskon Custom)</option>
                        <option value="DISABLED">DISABLED (Tidak Bisa Pakai Coin)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.coinFullPaymentAllowed || false}
                          onChange={(e) => updateVariant(vIndex, 'coinFullPaymentAllowed', e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-amber-500"
                        />
                        <span className="text-[11px] font-bold text-slate-200">Izinkan 100% Pembayaran Coin (Rp0 QRIS)</span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Dynamic FAQ Input List for Product */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-400" />
                <span>Daftar FAQ Produk (Pertanyaan & Jawaban)</span>
              </h3>
              <p className="text-[10px] text-slate-400">Admin bisa menambahkan lebih dari 1 FAQ khusus untuk produk ini.</p>
            </div>
            <button
              type="button"
              onClick={addFaqItem}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Tambah FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">FAQ #{index + 1}</span>
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFaqItem(faq.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Hapus FAQ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Pertanyaan"
                  value={faq.question}
                  onChange={(e) => updateFaqItem(faq.id, 'question', e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />

                <textarea
                  rows={2}
                  placeholder="Jawaban"
                  value={faq.answer}
                  onChange={(e) => updateFaqItem(faq.id, 'answer', e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CUSTOMER GUIDE (PANDUAN & KETENTUAN KHUSUS PRODUK) */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>CUSTOMER GUIDE (PANDUAN &amp; KETENTUAN KHUSUS PRODUK)</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Tutorial dan Syarat &amp; Ketentuan spesifik untuk produk ini (ditampilkan setelah produk berhasil dikirim).
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-bold text-slate-300">Tampilkan Setelah Pengiriman:</span>
                <input
                  type="checkbox"
                  checked={showGuideAfterDelivery}
                  onChange={(e) => setShowGuideAfterDelivery(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500 relative"></div>
                <span className={`text-[10px] font-extrabold ${showGuideAfterDelivery ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {showGuideAfterDelivery ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>
          </div>

          {/* Validation Warning Alert if ON but content is empty */}
          {showGuideAfterDelivery && !tutorialContent.trim() && !termsContent.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>⚠️ <strong>Perhatian:</strong> Fitur panduan diaktifkan, namun Tutorial dan S&amp;K belum diisi. Mohon lengkapi konten di bawah.</span>
            </div>
          )}

          {/* Guide Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-[11px] block">Versi Panduan (Guide Version)</label>
              <input
                type="number"
                min="1"
                value={guideVersion}
                onChange={(e) => setGuideVersion(e.target.value)}
                placeholder="1"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
              />
              <p className="text-[10px] text-slate-500">Naikkan versi jika Anda mengubah S&amp;K material untuk re-snapshot pembelian baru.</p>
            </div>

            <div className="flex flex-col justify-center space-y-1">
              <label className="font-bold text-slate-300 text-[11px] block">Wajibkan Persetujuan (Acknowledgement)</label>
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={requireGuideAcknowledgement}
                  onChange={(e) => setRequireGuideAcknowledgement(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                <span className="text-xs font-bold text-slate-300">
                  {requireGuideAcknowledgement ? 'Wajib Checkbox Sebelum Menggunakan' : 'Opsional (Tidak Wajib Checkbox)'}
                </span>
              </label>
            </div>
          </div>

          {/* Rich Editor: Tutorial Penggunaan */}
          <RichMarkdownEditor
            label="Tutorial Penggunaan Produk"
            helperText="Gunakan tombol toolbar untuk memformat langkah-langkah penggunaan produk"
            value={tutorialContent}
            onChange={setTutorialContent}
            placeholder="Contoh:&#10;1. Login menggunakan akun yang diberikan.&#10;2. Gunakan profil yang ditentukan.&#10;3. Jangan mengubah email atau password master."
            rows={7}
          />

          {/* Rich Editor: Syarat & Ketentuan Khusus Produk */}
          <RichMarkdownEditor
            label="Syarat & Ketentuan Khusus Produk (Product Terms)"
            helperText="Aturan pemakaian spesifik untuk produk ini (berlaku di samping Terms & Conditions global)"
            value={termsContent}
            onChange={setTermsContent}
            placeholder="Contoh:&#10;- Dilarang mengganti profil atau PIN selain yang diberikan.&#10;- Pelanggaran aturan pemakaian akan membatalkan garansi penggantian."
            rows={7}
          />

          {/* Optional Important Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Catatan Penting Tambahan (Optional)</span>
              <span className="text-[10px] text-slate-400">Akan ditampilkan dalam kotak highlight kuning di popup customer</span>
            </label>
            <textarea
              rows={2}
              value={importantNotes}
              onChange={(e) => setImportantNotes(e.target.value)}
              placeholder="Contoh: Pastikan logout dari akun Netflix lama sebelum login ke akun baru ini."
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
          <Link
            href="/admin/products"
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition font-bold"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 text-xs font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Perbarui Produk & Varian'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
