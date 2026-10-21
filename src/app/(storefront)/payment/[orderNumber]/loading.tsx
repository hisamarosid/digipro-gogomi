import React from 'react';
import { QrCode, ShieldCheck } from 'lucide-react';

export default function PaymentLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 space-y-6 animate-pulse">
      {/* Header Info Skeleton */}
      <div className="text-center space-y-2">
        <div className="h-6 w-36 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 w-64 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md mx-auto" />
      </div>

      {/* Main Payment Card Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/80 p-6 text-center space-y-6 shadow-2xl">
        {/* Total Amount Box Skeleton */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="h-3 w-28 bg-slate-800/60 rounded mx-auto" />
          <div className="h-8 w-44 bg-slate-800 rounded-lg mx-auto" />
        </div>

        {/* QR Code Canvas Skeleton */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-xs mx-auto space-y-3">
          <div className="h-52 w-52 bg-slate-800/80 rounded-xl flex items-center justify-center">
            <QrCode className="h-16 w-16 text-slate-700 animate-pulse" />
          </div>
          <div className="h-3 w-36 bg-slate-800/60 rounded" />
        </div>

        {/* Countdown Timer Skeleton */}
        <div className="h-10 w-full bg-slate-950/80 border border-slate-800/80 rounded-xl" />

        {/* Action Button Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="h-11 w-full bg-slate-800/80 rounded-xl" />
          <div className="h-24 w-full bg-blue-600/20 border border-blue-500/30 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
