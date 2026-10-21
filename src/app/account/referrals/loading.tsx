import React from 'react';

export default function CustomerReferralsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Referral Link Box Skeleton */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="flex gap-2">
          <div className="h-12 flex-1 bg-slate-950/60 border border-slate-800 rounded-xl" />
          <div className="h-12 w-28 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Referral Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-2">
            <div className="h-3 w-24 bg-slate-800/60 rounded" />
            <div className="h-7 w-20 bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
