'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToCloudinaryDirect } from '@/lib/cloudinary-client';

interface ImageUploadFieldProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
  aspectHint?: string;
}

export function ImageUploadField({
  label,
  sublabel,
  value,
  onChange,
  placeholder = 'https://res.cloudinary.com/... atau URL gambar',
  folder = 'products',
  aspectHint,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgressPercent(0);

    try {
      const result = await uploadToCloudinaryDirect(file, {
        purpose: 'PRODUCT',
        subfolder: folder,
        onProgress: (percent) => setProgressPercent(percent),
      });

      onChange(result.secureUrl || result.url);
      toast.success('Gambar berhasil diunggah ke Cloudinary!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Gagal mengunggah gambar ke Cloudinary.');
    } finally {
      setIsUploading(false);
      setProgressPercent(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-extrabold text-white text-xs block">{label}</label>
          {sublabel && <p className="text-[10px] text-slate-400">{sublabel}</p>}
        </div>
        {aspectHint && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            {aspectHint}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
        />

        {/* URL Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-rose-400 transition"
              title="Hapus gambar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 shrink-0"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{progressPercent > 0 ? `${progressPercent}%` : 'Mengunggah...'}</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Cloudinary</span>
            </>
          )}
        </button>

        {/* Thumbnail Preview */}
        <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative group">
          {value ? (
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-slate-600" />
          )}
        </div>
      </div>
    </div>
  );
}
