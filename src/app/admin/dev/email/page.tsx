'use client';

import React, { useEffect, useState } from 'react';
import {
  Mail,
  ShieldAlert,
  Eye,
  Trash2,
  RefreshCcw,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Code,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevEmailPreviewInboxPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<{ html: string; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchCapturedEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/dev/email?page=${page}&limit=15`);
      const json = await res.json();
      if (res.ok && json.success) {
        setJobs(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch {
      toast.error('Gagal memuat email dev captured');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapturedEmails();
  }, [page]);

  const handleOpenPreview = async (job: any) => {
    setSelectedJob(job);
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/dev/email/preview?jobId=${job.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPreviewContent(json.data);
      } else {
        toast.error('Gagal merender pratinjau email');
      }
    } catch {
      toast.error('Gagal merender pratinjau email');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua email dev captured?')) return;
    try {
      const res = await fetch('/api/admin/dev/email', { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Email captured berhasil dibersihkan');
        setSelectedJob(null);
        fetchCapturedEmails();
      }
    } catch {
      toast.error('Gagal membersihkan email captured');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Mail className="h-7 w-7 text-cyan-400" />
            <span>Dev Email Preview Inbox</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kotak surat simulasi pengembangan. Selama mode DEVELOPMENT, email tidak dikirimkan ke internet/customer asli.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-xs flex items-center gap-1.5 animate-pulse">
            <ShieldAlert className="h-4 w-4" /> DEVELOPMENT EMAIL MODE (CAPTURED)
          </span>

          {jobs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>Bersihkan Inbox</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email List */}
        <div className={`space-y-3 ${selectedJob ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse h-20" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
              <Mail className="h-12 w-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">Inbox Dev Masih Kosong</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Lakukan transaksi pembayaran, registrasi customer, atau reset password untuk memicu penangkapan email simulasi di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {jobs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenPreview(item)}
                  className={`p-4 rounded-2xl glass-panel border transition cursor-pointer flex items-center justify-between gap-3 shadow-lg ${
                    selectedJob?.id === item.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-white'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-1 text-xs min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                        {item.templateKey}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white truncate">{item.subjectSnapshot}</h3>
                    <p className="text-slate-400 text-xs truncate">Kepada: {item.recipientEmail}</p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Live Email Preview Drawer */}
        {selectedJob && (
          <div className="lg:col-span-7 rounded-3xl glass-panel border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                  DEV CAPTURED PREVIEW
                </span>
                <h2 className="text-base font-bold text-white mt-1">{selectedJob.subjectSnapshot}</h2>
                <p className="text-xs text-slate-400">Recipient: <span className="text-cyan-300 font-mono">{selectedJob.recipientEmail}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('html')}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      previewMode === 'html' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5" /> HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('text')}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      previewMode === 'text' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content Display */}
            {isPreviewLoading ? (
              <div className="h-96 flex items-center justify-center text-slate-400 text-xs">
                <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full mr-2" />
                Merender HTML Email...
              </div>
            ) : previewContent ? (
              previewMode === 'html' ? (
                <div className="rounded-2xl border border-slate-800 bg-white overflow-hidden h-[540px]">
                  <iframe
                    title="Email Preview"
                    srcDoc={previewContent.html}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs overflow-auto h-[540px] whitespace-pre-wrap">
                  {previewContent.text}
                </pre>
              )
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
