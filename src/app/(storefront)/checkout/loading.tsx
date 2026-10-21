import React from 'react';
import { ShoppingBag, ShieldCheck, QrCode } from 'lucide-react';

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="text-center space-y-2">
        <div className="h-8 w-48 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md mx-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column Skeleton: Customer Form & Items */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Data Skeleton */}
          <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-slate-800 rounded-full" />
              <div className="h-5 w-40 bg-slate-800 rounded-md" />
            </div>
            <div className="space-y-3">
              <div className="h-10 w-full bg-slate-950/80 border border-slate-800/80 rounded-xl" />
              <div className="h-10 w-full bg-slate-950/80 border border-slate-800/80 rounded-xl" />
              <div className="h-10 w-full bg-slate-950/80 border border-slate-800/80 rounded-xl" />
            </div>
          </div>

          {/* Cart Items Skeleton */}
          <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
            <div className="h-5 w-36 bg-slate-800 rounded-md" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                  <div className="h-14 w-14 bg-slate-800 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800/60 rounded" />
                  </div>
                  <div className="h-5 w-20 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column Skeleton: Payment Summary */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-6 space-y-6">
            <div className="h-5 w-36 bg-slate-800 rounded-md" />
            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-800/60 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-slate-800/60 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded" />
              </div>
              <div className="h-px bg-slate-800/80 my-2" />
              <div className="flex justify-between">
                <div className="h-6 w-28 bg-slate-800 rounded" />
                <div className="h-7 w-32 bg-slate-800 rounded-lg" />
              </div>
            </div>
            <div className="h-12 w-full bg-blue-600/40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
