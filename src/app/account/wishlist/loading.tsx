import React from 'react';

export default function CustomerWishlistLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md" />
      </div>

      {/* Grid Products Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
            <div className="h-36 w-full bg-slate-800 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-800/60 rounded" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 w-24 bg-slate-800 rounded" />
              <div className="h-8 w-24 bg-slate-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
