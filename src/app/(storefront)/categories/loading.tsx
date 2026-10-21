import React from 'react';

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 p-8 space-y-4">
        <div className="h-6 w-44 bg-slate-800 rounded-full" />
        <div className="h-8 w-64 bg-slate-800 rounded-lg" />
        <div className="h-4 w-96 bg-slate-800/60 rounded-md" />
      </div>

      {/* Grid Categories Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-800" />
              <div className="h-6 w-24 bg-slate-800 rounded-full" />
            </div>

            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800/60 rounded" />
            </div>

            <div className="pt-4 border-t border-slate-800/60 flex justify-between items-center">
              <div className="h-4 w-32 bg-slate-800/60 rounded" />
              <div className="h-4 w-4 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
