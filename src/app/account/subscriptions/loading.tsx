import React from 'react';

export default function CustomerSubscriptionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md" />
      </div>

      {/* Subscription List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-5 w-44 bg-slate-800 rounded" />
                <div className="h-4 w-28 bg-slate-800/70 rounded" />
                <div className="h-3 w-36 bg-slate-800/50 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-800 rounded-full" />
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex justify-end">
              <div className="h-9 w-48 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
