import React from 'react';

export default function CustomerProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-52 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Product Fulfillment Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-slate-800 rounded" />
                <div className="h-4 w-32 bg-slate-800/70 rounded" />
                <div className="h-3 w-40 bg-slate-800/50 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-800 rounded-full" />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
              <div className="h-4 w-3/4 bg-slate-800/70 rounded" />
              <div className="h-4 w-1/2 bg-slate-800/50 rounded" />
            </div>

            <div className="flex justify-between items-center pt-1">
              <div className="h-4 w-28 bg-slate-800/60 rounded" />
              <div className="h-9 w-36 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
