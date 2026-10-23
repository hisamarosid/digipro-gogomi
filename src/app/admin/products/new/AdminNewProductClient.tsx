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
  Zap,
  Eye,
  CheckCircle2,
  Sparkles,
  Shield,
  Layers,
  Users,
  Key,
  ChevronDown,
  ChevronUp,
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

interface AdminNewProductClientProps {
  categories: any[];
}

export interface VariantFormItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  unitLabel?: string;
  quotaRemaining?: string;
  defaultCostAmount: string;
  deliveryType: string;
  deliveryModel: string;
  warrantyDays: string;
  
  // Shared Account Settings
  sharedCapacityDefault: string;
  sharedSlotLabelPrefix: string;
  sharedSafetyBufferDays: string;
  sharedRequireMasterLifetimeCheck: boolean;
  sharedAllowMassReplacement?: boolean;
  sharedAllowSlotReuseAfterExpiration?: boolean;
  sharedExposeMasterCredentialToCustomer: boolean;
  sharedExposeSlotPin: boolean;
  usesProfile?: boolean;
  usesProfilePin?: boolean;

  // Replacement Settings
  replacementEnabled: boolean;
  replacementMode: string;
  replacementCooldownHours: string;
  replacementMaxCount: string;
  replacementValidityType: string;
  replacementValidityDays: string;
  replacementRequiresReason: boolean;
  replacementAllowWhenOutOfStockQueue: boolean;
  
  // UI collapse
  isExpanded?: boolean;
}

export function AdminNewProductClient({ categories }: AdminNewProductClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [shortDesc, setShortDesc] = useState('');
  const [etaLabel, setEtaLabel] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  
  // Images
  const [thumbnail, setThumbnail] = useState('');
  const [gallery, setGallery] = useState<string[]>(['']);

  const [status, setStatus] = useState('ACTIVE');
  const [featured, setFeatured] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Guide States
  const [tutorialContent, setTutorialContent] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [guideVersion, setGuideVersion] = useState('1');
  const [showGuideAfterDelivery, setShowGuideAfterDelivery] = useState(false);
  const [requireGuideAcknowledgement, setRequireGuideAcknowledgement] = useState(false);

  // Multi-Variants State
  const [variants, setVariants] = useState<VariantFormItem[]>([
    {
      id: 'v-1',
      name: 'Lisensi Standard 1 Bulan',
      sku: '',
      price: '50000',
      compareAtPrice: '100000',
      defaultCostAmount: '25000',
      deliveryType: 'ACCOUNT',
      deliveryModel: 'DEDICATED_ACCOUNT',
      warrantyDays: '30',
      sharedCapacityDefault: '2',
      sharedSlotLabelPrefix: 'USER',
      sharedSafetyBufferDays: '2',
      sharedRequireMasterLifetimeCheck: true,
      sharedExposeMasterCredentialToCustomer: true,
      sharedExposeSlotPin: true,
      replacementEnabled: true,
      replacementMode: 'AUTO',
      replacementCooldownHours: '72',
      replacementMaxCount: '3',
      replacementValidityType: 'SUBSCRIPTION',
      replacementValidityDays: '30',
      replacementRequiresReason: false,
      replacementAllowWhenOutOfStockQueue: true,
      isExpanded: true,
    },
  ]);

  // FAQs state
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([
    {
      id: 'faq-1',
      question: 'Bagaimana proses pengiriman produk setelah pembayaran?',
      answer: 'Kredensial/Lisensi dikirimkan secara otomatis secara instant dalam 1-5 detik ke akun Anda.',
    },
    {
      id: 'faq-2',
      question: 'Apakah produk ini bergaransi penuh?',
      answer: 'Ya, semua produk Gogomi Store dilindungi garansi penggantian otomatis jika terjadi error selama masa aktif.',
    },
  ]);

  // Auto Generate Main SKU
  const generateMainSku = () => {
    if (!name.trim()) {
      toast.error('Masukkan nama produk terlebih dahulu');
      return;
    }
    const cleanName = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const random = Math.floor(1000 + Math.random() * 9000);
    const newSku = `PRD-${cleanName || 'DIGI'}-${random}`;
    setSku(newSku);

    // Update variant SKUs if empty
    setVariants((prev) =>
      prev.map((v, idx) => ({
        ...v,
        sku: v.sku ? v.sku : `${newSku}-V${idx + 1}`,
      }))
    );
    toast.success(`SKU berhasil dibuat: ${newSku}`);
  };

  // Preset Templates Helper
  const applyPreset = (presetType: 'STREAMING' | 'AI_TOOL' | 'DESIGN' | 'VPN') => {
    if (presetType === 'STREAMING') {
      setName('Netflix Premium Private 4K UHD');
      setShortDesc('Akun Netflix Premium 4K UHD Private 1 Profile dengan PIN Kunci.');
      setFullDesc('Nikmati tayangan favorit di Netflix dengan kualitas 4K Ultra HD. Akun 100% resmi, Private Profile dilengkapi PIN khusus. Garansi full 30 hari.');
      setThumbnail('https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80');
      setGallery([
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&q=80',
      ]);
      setVariants([
        {
          id: 'v-1',
          name: 'Profile Shared (1 User)',
          sku: 'NFLX-SHR-1M',
          price: '35000',
          compareAtPrice: '65000',
          defaultCostAmount: '18000',
          deliveryType: 'ACCOUNT',
          deliveryModel: 'SHARED_ACCOUNT',
          warrantyDays: '30',
          sharedCapacityDefault: '5',
          sharedSlotLabelPrefix: 'PROFILE',
          sharedSafetyBufferDays: '2',
          sharedRequireMasterLifetimeCheck: true,
          sharedExposeMasterCredentialToCustomer: true,
          sharedExposeSlotPin: true,
          replacementEnabled: true,
          replacementMode: 'AUTO',
          replacementCooldownHours: '24',
          replacementMaxCount: '5',
          replacementValidityType: 'SUBSCRIPTION',
          replacementValidityDays: '30',
          replacementRequiresReason: false,
          replacementAllowWhenOutOfStockQueue: true,
          isExpanded: true,
        },
        {
          id: 'v-2',
          name: 'Private Full Account (5 Screen)',
          sku: 'NFLX-PRV-1M',
          price: '165000',
          compareAtPrice: '220000',
          defaultCostAmount: '95000',
          deliveryType: 'ACCOUNT',
          deliveryModel: 'DEDICATED_ACCOUNT',
          warrantyDays: '30',
          sharedCapacityDefault: '1',
          sharedSlotLabelPrefix: 'USER',
          sharedSafetyBufferDays: '2',
          sharedRequireMasterLifetimeCheck: true,
          sharedExposeMasterCredentialToCustomer: true,
          sharedExposeSlotPin: false,
          replacementEnabled: true,
          replacementMode: 'AUTO',
          replacementCooldownHours: '48',
          replacementMaxCount: '3',
          replacementValidityType: 'SUBSCRIPTION',
          replacementValidityDays: '30',
          replacementRequiresReason: false,
          replacementAllowWhenOutOfStockQueue: true,
          isExpanded: false,
        },
      ]);
    } else if (presetType === 'AI_TOOL') {
      setName('ChatGPT Plus Official (GPT-4o & Sora Access)');
      setShortDesc('Akses resmi OpenAI ChatGPT Plus dengan fitur DALL-E 3 & Data Analysis.');
      setFullDesc('Tingkatkan produktivitas kerja dan coding Anda dengan ChatGPT Plus GPT-4o. Kecepatan respon tinggi, tanpa limit antrean, serta fitur pembuatan gambar DALL-E 3.');
      setThumbnail('https://images.unsplash.com/photo-1677442136019-21780efad99a?w=500&q=80');
      setGallery([
        'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1000&q=80',
      ]);
      setVariants([
        {
          id: 'v-1',
          name: 'Shared Access 1 Bulan (Sharing 3 User)',
          sku: 'CGPT-SHR-1M',
          price: '65000',
          compareAtPrice: '120000',
          defaultCostAmount: '30000',
          deliveryType: 'ACCOUNT',
          deliveryModel: 'SHARED_ACCOUNT',
          warrantyDays: '30',
          sharedCapacityDefault: '3',
          sharedSlotLabelPrefix: 'SLOT',
          sharedSafetyBufferDays: '2',
          sharedRequireMasterLifetimeCheck: true,
          sharedExposeMasterCredentialToCustomer: true,
          sharedExposeSlotPin: false,
          replacementEnabled: true,
          replacementMode: 'AUTO',
          replacementCooldownHours: '48',
          replacementMaxCount: '3',
          replacementValidityType: 'SUBSCRIPTION',
          replacementValidityDays: '30',
          replacementRequiresReason: false,
          replacementAllowWhenOutOfStockQueue: true,
          isExpanded: true,
        },
      ]);
    } else if (presetType === 'DESIGN') {
      setName('Canva Pro Invitiation 1 Tahun Full Garansi');
      setShortDesc('Upgrade email pribadi Anda ke Canva Pro Brand Kit 1 Tahun.');
      setFullDesc('Buka 100+ juta foto, font, elemen premium, serta remove background 1-klik Canva Pro di email pribadi Anda tanpa ganti akun.');
      setThumbnail('https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&q=80');
      setGallery([
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1000&q=80',
      ]);
      setVariants([
        {
          id: 'v-1',
          name: 'Invite Member 1 Tahun',
          sku: 'CNV-INV-1Y',
          price: '25000',
          compareAtPrice: '95000',
          defaultCostAmount: '5000',
          deliveryType: 'LICENSE_KEY',
          deliveryModel: 'FAMILY_GROUP',
          warrantyDays: '365',
          sharedCapacityDefault: '500',
          sharedSlotLabelPrefix: 'MEMBER',
          sharedSafetyBufferDays: '5',
          sharedRequireMasterLifetimeCheck: true,
          sharedExposeMasterCredentialToCustomer: false,
          sharedExposeSlotPin: false,
          replacementEnabled: true,
          replacementMode: 'AUTO',
          replacementCooldownHours: '72',
          replacementMaxCount: '10',
          replacementValidityType: 'SUBSCRIPTION',
          replacementValidityDays: '365',
          replacementRequiresReason: false,
          replacementAllowWhenOutOfStockQueue: true,
          isExpanded: true,
        },
      ]);
    } else if (presetType === 'VPN') {
      setName('ExpressVPN Premium Dedicated 1 Tahun');
      setShortDesc('VPN Tercepat & Teraman di Dunia untuk Streaming & Privacy.');
      setFullDesc('Akses 3,000+ server di 94 negara dengan kecepatan tanpa batas. Lindungi privasi internet Anda dengan enkripsi kelas militer AES-256.');
      setThumbnail('https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&q=80');
      setGallery([
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1000&q=80',
      ]);
      setVariants([
        {
          id: 'v-1',
          name: 'Activation Code 1 Tahun',
          sku: 'EXVPN-KEY-1Y',
          price: '120000',
          compareAtPrice: '250000',
          defaultCostAmount: '60000',
          deliveryType: 'LICENSE_KEY',
          deliveryModel: 'LICENSE_KEY',
          warrantyDays: '365',
          sharedCapacityDefault: '1',
          sharedSlotLabelPrefix: 'KEY',
          sharedSafetyBufferDays: '0',
          sharedRequireMasterLifetimeCheck: false,
          sharedExposeMasterCredentialToCustomer: false,
          sharedExposeSlotPin: false,
          replacementEnabled: true,
          replacementMode: 'AUTO',
          replacementCooldownHours: '72',
          replacementMaxCount: '3',
          replacementValidityType: 'SUBSCRIPTION',
          replacementValidityDays: '365',
          replacementRequiresReason: false,
          replacementAllowWhenOutOfStockQueue: true,
          isExpanded: true,
        },
      ]);
    }
    generateMainSku();
    toast.success(`Preset template ${presetType} berhasil diterapkan!`);
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
        subfolder: sku ? `gallery_${sku}` : 'gallery_new',
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
          subfolder: sku ? `gallery_${sku}` : 'gallery_new',
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
    setFaqs((prev) => [...prev, { id: `faq-${Date.now()}`, question: '', answer: '' }]);
  };

  const removeFaqItem = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFaqItem = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Variant Manager Methods
  const addVariant = () => {
    const nextIdx = variants.length + 1;
    const newVariant: VariantFormItem = {
      id: `v-${Date.now()}`,
      name: `Varian Paket ${nextIdx}`,
      sku: sku ? `${sku}-V${nextIdx}` : '',
      price: '50000',
      compareAtPrice: '100000',
      defaultCostAmount: '25000',
      deliveryType: 'ACCOUNT',
      deliveryModel: 'DEDICATED_ACCOUNT',
      warrantyDays: '30',
      sharedCapacityDefault: '2',
      sharedSlotLabelPrefix: 'USER',
      sharedSafetyBufferDays: '2',
      sharedRequireMasterLifetimeCheck: true,
      sharedExposeMasterCredentialToCustomer: true,
      sharedExposeSlotPin: true,
      replacementEnabled: true,
      replacementMode: 'AUTO',
      replacementCooldownHours: '72',
      replacementMaxCount: '3',
      replacementValidityType: 'SUBSCRIPTION',
      replacementValidityDays: '30',
      replacementRequiresReason: false,
      replacementAllowWhenOutOfStockQueue: true,
      isExpanded: true,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) {
      toast.error('Produk wajib memiliki minimal 1 varian paket');
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof VariantFormItem, value: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const toggleVariantExpand = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isExpanded: !v.isExpanded } : v))
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      toast.error('Nama produk dan Kategori wajib diisi');
      return;
    }

    const finalSku = sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: finalSku,
          categoryId,
          shortDesc: shortDesc.trim(),
          etaLabel: etaLabel.trim() || null,
          fullDesc: fullDesc.trim(),
          thumbnail: thumbnail.trim(),
          gallery: gallery.map((g) => g.trim()).filter(Boolean),
          status,
          featured,
          bestSeller,
          variants: variants.map((v, idx) => ({
            name: v.name.trim() || `Varian ${idx + 1}`,
            sku: v.sku.trim() || `${finalSku}-V${idx + 1}`,
            price: Number(v.price) || 0,
            compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
            unitLabel: v.unitLabel?.trim() || null,
            quotaRemaining: v.quotaRemaining === '' || v.quotaRemaining == null ? null : Number(v.quotaRemaining),
            defaultCostAmount: Number(v.defaultCostAmount) || 0,
            deliveryType: v.deliveryType,
            deliveryModel: v.deliveryModel,
            warrantyDays: Number(v.warrantyDays) || 30,
            sharedCapacityDefault: Number(v.sharedCapacityDefault) || 2,
            sharedSlotLabelPrefix: v.sharedSlotLabelPrefix || 'USER',
            sharedSafetyBufferDays: Number(v.sharedSafetyBufferDays) || 2,
            sharedRequireMasterLifetimeCheck: Boolean(v.sharedRequireMasterLifetimeCheck),
            sharedAllowMassReplacement: Boolean(v.sharedAllowMassReplacement),
            sharedAllowSlotReuseAfterExpiration: Boolean(v.sharedAllowSlotReuseAfterExpiration),
            sharedExposeMasterCredentialToCustomer: Boolean(v.sharedExposeMasterCredentialToCustomer),
            sharedExposeSlotPin: Boolean(v.sharedExposeSlotPin),
            usesProfile: Boolean(v.usesProfile),
            usesProfilePin: Boolean(v.usesProfilePin),
            replacementEnabled: Boolean(v.replacementEnabled),
            replacementMode: v.replacementMode || 'DISABLED',
            replacementCooldownHours: Number(v.replacementCooldownHours) || 72,
            replacementMaxCount: v.replacementMaxCount ? Number(v.replacementMaxCount) : null,
            replacementValidityType: v.replacementValidityType || 'SUBSCRIPTION',
            replacementValidityDays: Number(v.replacementValidityDays) || 30,
            replacementRequiresReason: Boolean(v.replacementRequiresReason),
            replacementAllowWhenOutOfStockQueue: Boolean(v.replacementAllowWhenOutOfStockQueue),
          })),
          faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
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
        toast.success('Produk digital baru berhasil diterbitkan!');
        router.push('/admin/products');
      } else {
        toast.error(json.error || 'Gagal menyimpan produk');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi saat menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate lowest display price
  const lowestPrice = variants.reduce(
    (min, v) => (Number(v.price) < min ? Number(v.price) : min),
    Number(variants[0]?.price || 0)
  );

  return (
    <div className="space-y-6 max-w-6xl pb-20">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Package className="h-6 w-6 text-cyan-400" />
              <span>Tambah Produk Digital Baru</span>
            </h1>
            <p className="text-xs text-slate-400">
              Buat produk digital dengan dukungan Multi-Varian, Shared Slot Patungan, & Auto Replacement.
            </p>
          </div>
        </div>

        {/* Quick Presets Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Preset Cepat:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('STREAMING')}
            className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold transition"
          >
            🎬 Streaming App
          </button>
          <button
            type="button"
            onClick={() => applyPreset('AI_TOOL')}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold transition"
          >
            🤖 AI Tools
          </button>
          <button
            type="button"
            onClick={() => applyPreset('DESIGN')}
            className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[11px] font-bold transition"
          >
            🎨 Design App
          </button>
          <button
            type="button"
            onClick={() => applyPreset('VPN')}
            className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-[11px] font-bold transition"
          >
            🔐 VPN Security
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Form (Left 2 Columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 text-xs">
          
          {/* Section 1: Informasi Utama Produk */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h2 className="font-black text-white text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-400" />
              <span>1. Informasi Utama Produk</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Nama Produk Digital *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Canva Pro 1 Tahun Private Email"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">SKU Unik Produk *</label>
                  <button
                    type="button"
                    onClick={generateMainSku}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Zap className="h-3 w-3" /> Auto SKU
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PRD-CANVA-908"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Kategori Katalog *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Status Publikasi</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-bold"
                >
                  <option value="ACTIVE">🟢 ACTIVE (Tampil di Katalog Toko)</option>
                  <option value="DRAFT">🟡 DRAFT (Simpan Sebagai Draf)</option>
                  <option value="INACTIVE">🔴 INACTIVE (Nonaktifkan sementara)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Tampilkan di Featured Products
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bestSeller}
                  onChange={(e) => setBestSeller(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  🔥 Badge Best Seller
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Deskripsi Singkat (Ringkasan Fitur 1 Kalimat) *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Canva Pro Brand Kit 1 Tahun garansi penuh penggantian akun."
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Estimasi Pengerjaan (khusus Jasa)</label>
              <input
                type="text"
                maxLength={60}
                placeholder="Contoh: 1x24 jam, 3 hari, 1 bulan"
                value={etaLabel}
                onChange={(e) => setEtaLabel(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500">Tampil sebagai label waktu di gambar kartu produk jasa.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Deskripsi Lengkap & Fitur Lisensi *</label>
              <textarea
                rows={4}
                required
                placeholder="Detail lengkap lisensi, fitur unggulan, ketentuan garansi, dan panduan klaim..."
                value={fullDesc}
                onChange={(e) => setFullDesc(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 2: Media & Gambar */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h2 className="font-black text-white text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400" />
              <span>2. Media & Gambar Produk (Squircle App Logo & Gallery)</span>
            </h2>

            {/* Thumbnail */}
            <ImageUploadField
              label="Gambar 1: Logo App / Icon Product (Squircle Thumbnail)"
              sublabel="Logo persegi/squircle yang tampil di kartu produk katalog toko."
              value={thumbnail}
              onChange={setThumbnail}
              placeholder="URL Logo App atau Klik 'Pilih File'"
              folder="products"
              aspectHint="1:1 (Square)"
            />

            {/* Gallery */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="font-extrabold text-white text-xs block">
                    Gambar 2+: Slider Banner / Gallery Screenshot Deskripsi
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Bisa menambahkan lebih dari 1 gambar banner deskripsi pendukung.
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
                      placeholder={`URL Gambar Banner #${index + 1} atau Klik Upload`}
                      value={imgUrl}
                      onChange={(e) => updateGalleryImage(index, e.target.value)}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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
                        <img src={imgUrl} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-600 font-bold">Preview</span>
                      )}
                    </div>
                    {gallery.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="p-2 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Manajemen Multi-Varian Paket & Pengiriman */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-black text-white text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>3. Manajemen Varian Paket Produk ({variants.length} Varian)</span>
                </h2>
                <p className="text-[10px] text-slate-400">
                  Atur nama paket, harga jual, model inventori (Shared Slot / Private / Key), & aturan replacement.
                </p>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold transition shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>+ Tambah Varian Paket</span>
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, vIdx) => (
                <div
                  key={variant.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4 relative transition"
                >
                  {/* Variant Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">
                        {vIdx + 1}
                      </span>
                      <h3 className="font-extrabold text-white text-xs">
                        {variant.name || `Varian #${vIdx + 1}`}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                        {variant.deliveryModel}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        Rp{Number(variant.price || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVariantExpand(variant.id)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                      >
                        {variant.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-slate-900 border border-slate-800"
                          title="Hapus varian ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variant Form Details */}
                  {variant.isExpanded && (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Nama Varian Paket *</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Profile Shared 1 User"
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-semibold focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">SKU Varian *</label>
                          <input
                            type="text"
                            placeholder="Contoh: PRD-CANVA-V1"
                            value={variant.sku}
                            onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Harga Jual (Rp) *</label>
                          <input
                            type="number"
                            required
                            value={variant.price}
                            onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Harga Coret (Rp)</label>
                          <input
                            type="number"
                            value={variant.compareAtPrice}
                            onChange={(e) => updateVariant(variant.id, 'compareAtPrice', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Satuan Harga (Jasa)</label>
                          <input
                            type="text"
                            maxLength={60}
                            value={variant.unitLabel || ''}
                            onChange={(e) => updateVariant(variant.id, 'unitLabel', e.target.value)}
                            placeholder="Contoh: 1 CV, 1 Project"
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Sisa Kuota (Jasa)</label>
                          <input
                            type="number"
                            min={0}
                            value={variant.quotaRemaining ?? ''}
                            onChange={(e) => updateVariant(variant.id, 'quotaRemaining', e.target.value)}
                            placeholder="Kosongkan = tanpa batas"
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Harga Modal Default / COGS (Rp)</label>
                          <input
                            type="number"
                            value={variant.defaultCostAmount}
                            onChange={(e) => updateVariant(variant.id, 'defaultCostAmount', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Garansi (Hari)</label>
                          <input
                            type="number"
                            value={variant.warrantyDays}
                            onChange={(e) => updateVariant(variant.id, 'warrantyDays', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* Delivery Model & Format */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-cyan-400" /> Model Inventori Digital
                          </label>
                          <select
                            value={variant.deliveryModel}
                            onChange={(e) => updateVariant(variant.id, 'deliveryModel', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                          >
                            <option value="DEDICATED_ACCOUNT">DEDICATED_ACCOUNT (Akun Private Single User)</option>
                            <option value="SHARED_ACCOUNT">SHARED_ACCOUNT (Akun Patungan / Multiple Slots)</option>
                            <option value="FAMILY_GROUP">FAMILY_GROUP (Invite Group Family)</option>
                            <option value="LICENSE_KEY">LICENSE_KEY (Serial Key / Kode Voucher)</option>
                            <option value="CUSTOM_CREDENTIAL">CUSTOM_CREDENTIAL (Top Up ID / Custom Data)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Key className="h-3.5 w-3.5 text-cyan-400" /> Tipe Kredensial Pengiriman
                          </label>
                          <select
                            value={variant.deliveryType}
                            onChange={(e) => updateVariant(variant.id, 'deliveryType', e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="ACCOUNT">ACCOUNT (Username & Password)</option>
                            <option value="LICENSE_KEY">LICENSE_KEY (Serial / Voucher Code)</option>
                            <option value="DOWNLOAD_LINK">DOWNLOAD_LINK (File Asset Link)</option>
                          </select>
                        </div>
                      </div>

                      {/* Shared Account Sub-Settings */}
                      {variant.deliveryModel === 'SHARED_ACCOUNT' && (
                        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-3">
                          <h4 className="font-extrabold text-cyan-300 text-[11px] flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span>KONTROL KAPASITAS PATUNGAN (SHARED SLOTS)</span>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Kapasitas Slot (User/Akun)</label>
                              <input
                                type="number"
                                value={variant.sharedCapacityDefault}
                                onChange={(e) => updateVariant(variant.id, 'sharedCapacityDefault', e.target.value)}
                                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white font-bold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Prefix Label Slot</label>
                              <input
                                type="text"
                                value={variant.sharedSlotLabelPrefix}
                                onChange={(e) => updateVariant(variant.id, 'sharedSlotLabelPrefix', e.target.value)}
                                placeholder="USER / PROFILE"
                                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white font-mono uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Safety Buffer (Hari)</label>
                              <input
                                type="number"
                                value={variant.sharedSafetyBufferDays}
                                onChange={(e) => updateVariant(variant.id, 'sharedSafetyBufferDays', e.target.value)}
                                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={variant.usesProfile !== false}
                                onChange={(e) => updateVariant(variant.id, 'usesProfile', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-500"
                              />
                              <span>Gunakan Profile per Slot (Contoh: Netflix / CapCut)</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={variant.usesProfilePin !== false}
                                onChange={(e) => updateVariant(variant.id, 'usesProfilePin', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-500"
                              />
                              <span>Wajibkan PIN per Profile</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={variant.sharedExposeMasterCredentialToCustomer}
                                onChange={(e) => updateVariant(variant.id, 'sharedExposeMasterCredentialToCustomer', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-500"
                              />
                              <span>Tampilkan Email/Pass Master ke Customer</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={variant.sharedExposeSlotPin}
                                onChange={(e) => updateVariant(variant.id, 'sharedExposeSlotPin', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-800 text-cyan-500"
                              />
                              <span>Tampilkan PIN Slot Profile di Customer</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Auto Replacement Configuration */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="font-extrabold text-white text-[11px] flex items-center gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                            <span>SISTEM AUTO REPLACEMENT GARANSI</span>
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={variant.replacementEnabled}
                              onChange={(e) => updateVariant(variant.id, 'replacementEnabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </div>

                        {variant.replacementEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Mode Approval</label>
                              <select
                                value={variant.replacementMode}
                                onChange={(e) => updateVariant(variant.id, 'replacementMode', e.target.value)}
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white"
                              >
                                <option value="AUTO">Automatic (Instan)</option>
                                <option value="MANUAL_APPROVAL">Manual Approval Admin</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Cooldown Klaim (Jam)</label>
                              <input
                                type="number"
                                value={variant.replacementCooldownHours}
                                onChange={(e) => updateVariant(variant.id, 'replacementCooldownHours', e.target.value)}
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-300 block">Maksimal Replacement</label>
                              <input
                                type="number"
                                value={variant.replacementMaxCount}
                                onChange={(e) => updateVariant(variant.id, 'replacementMaxCount', e.target.value)}
                                placeholder="Kosong = Unlimited"
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: FAQs Produk */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-400" />
                  <span>4. Pertanyaan Umum Produk (FAQs)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Ditampilkan di tab FAQ halaman detail produk toko.</p>
              </div>
              <button
                type="button"
                onClick={addFaqItem}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold transition"
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
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Pertanyaan (e.g. Apakah produk ini bergaransi resmi?)"
                    value={faq.question}
                    onChange={(e) => updateFaqItem(faq.id, 'question', e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />

                  <textarea
                    rows={2}
                    placeholder="Jawaban (e.g. Ya, garansi penuh penggantian akun baru.)"
                    value={faq.answer}
                    onChange={(e) => updateFaqItem(faq.id, 'answer', e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Customer Guide (Tutorial & Syarat Ketentuan Khusus Produk) */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  <span>5. Customer Guide (Panduan &amp; Ketentuan Khusus Produk)</span>
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

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              href="/admin/products"
              className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition font-bold"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 text-xs font-extrabold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan Produk Baru'}</span>
            </button>
          </div>
        </form>

        {/* Sidebar Live Preview (Right 1 Column) */}
        <div className="space-y-4 sticky top-20">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="font-extrabold text-white text-xs flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span>Preview Live Kartu Toko (Storefront)</span>
            </h3>

            {/* Product Card Mockup */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 shadow-xl relative overflow-hidden group">
              {bestSeller && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                  BEST SELLER
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Thumbnail Squircle */}
                <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                  {thumbnail ? (
                    <img src={thumbnail} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-slate-600" />
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    {categories.find((c) => c.id === categoryId)?.name || 'Kategori'}
                  </span>
                  <h4 className="font-bold text-white text-xs truncate">
                    {name || 'Nama Produk Digital'}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">
                    {shortDesc || 'Deskripsi singkat fitur produk akan muncul di sini...'}
                  </p>
                </div>
              </div>

              {/* Price & Variant Pill */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Mulai dari</span>
                  <span className="font-black text-emerald-400 text-sm">
                    Rp{lowestPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold inline-block">
                    {variants.length} Varian Paket
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Checklist Info */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Pengiriman Otomatis Instant</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <Shield className="h-3.5 w-3.5" />
                <span>Auto Replacement Garansi Aktif</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Model Inventori: {variants[0]?.deliveryModel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
