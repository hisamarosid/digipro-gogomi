import React from 'react';

export default function CustomerWaitlistLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md" />
      </div>

      {/* Waitlist List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-800 rounded" />
                <div className="h-3 w-28 bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="h-9 w-28 bg-slate-800 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
