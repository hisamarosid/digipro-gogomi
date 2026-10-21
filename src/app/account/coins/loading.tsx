import React from 'react';

export default function CustomerCoinsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md" />
      </div>

      {/* Balance Card Skeleton */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-800/60 rounded" />
            <div className="h-8 w-36 bg-slate-800 rounded-lg" />
          </div>
          <div className="h-10 w-28 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* History Table Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-800 rounded-md" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-800 rounded" />
                <div className="h-3 w-28 bg-slate-800/60 rounded" />
              </div>
              <div className="h-5 w-20 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
