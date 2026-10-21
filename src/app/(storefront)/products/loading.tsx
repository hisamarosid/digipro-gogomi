import React from 'react';

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-60 bg-slate-800 rounded-lg" />
          <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
        </div>

        {/* Category Pills Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-28 bg-slate-900 border border-slate-800 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Control Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-4 w-44 bg-slate-800/60 rounded" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-48 bg-slate-900 border border-slate-800 rounded-xl" />
          <div className="h-10 w-32 bg-slate-900 border border-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 bg-slate-800 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 bg-slate-800/60 rounded" />
                <div className="h-4 w-3/4 bg-slate-800 rounded" />
                <div className="h-3 w-1/2 bg-slate-800/50 rounded" />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/60 flex justify-between gap-2">
              <div className="h-9 flex-1 bg-slate-800/60 rounded-xl" />
              <div className="h-9 flex-1 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
