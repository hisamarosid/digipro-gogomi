import React from 'react';

export default function CustomerRenewalsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Renewals Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-800 rounded" />
                <div className="h-4 w-32 bg-slate-800/70 rounded" />
                <div className="h-3 w-40 bg-slate-800/50 rounded" />
              </div>
              <div className="h-6 w-28 bg-slate-800 rounded-full" />
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center">
              <div className="h-4 w-32 bg-slate-800/60 rounded" />
              <div className="h-9 w-40 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
