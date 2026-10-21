import React from 'react';

export default function PaymentSuccessLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 space-y-6 animate-pulse">
      {/* Success Banner Skeleton */}
      <div className="text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <div className="h-8 w-8 bg-emerald-400/40 rounded-full" />
        </div>
        <div className="h-8 w-56 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md mx-auto" />
      </div>

      {/* Order Summary Card Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/80 p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="h-4 w-28 bg-slate-800/60 rounded" />
          <div className="h-4 w-32 bg-slate-800 rounded" />
        </div>

        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="h-4 w-28 bg-slate-800/60 rounded" />
          <div className="h-6 w-28 bg-emerald-500/30 rounded-lg" />
        </div>

        {/* Revealed Products Box Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="h-4 w-40 bg-slate-800/80 rounded" />
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1 flex-1">
                <div className="h-4 w-48 bg-slate-800 rounded" />
                <div className="h-3 w-28 bg-slate-800/60 rounded" />
              </div>
              <div className="h-5 w-20 bg-emerald-500/20 rounded" />
            </div>
            <div className="h-10 w-full bg-slate-900 border border-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Action CTAs Skeleton */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <div className="h-12 flex-1 bg-emerald-500/40 rounded-xl" />
          <div className="h-12 flex-1 bg-slate-800/80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
