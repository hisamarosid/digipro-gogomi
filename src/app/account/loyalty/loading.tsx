import React from 'react';

export default function CustomerLoyaltyLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Tier Badge Banner Skeleton */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-36 bg-slate-800 rounded" />
            <div className="h-4 w-48 bg-slate-800/60 rounded" />
          </div>
          <div className="h-10 w-28 bg-slate-800 rounded-full" />
        </div>

        {/* Progress Bar Skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-24 bg-slate-800/60 rounded" />
            <div className="h-3 w-16 bg-slate-800/60 rounded" />
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Tiers List Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-3">
            <div className="h-5 w-28 bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-800/60 rounded" />
            <div className="h-3 w-36 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
