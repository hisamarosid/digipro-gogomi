import React from 'react';

export default function AccountDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/50 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-800/80 rounded" />
              <div className="h-4 w-4 bg-slate-800 rounded-full" />
            </div>
            <div className="h-7 w-16 bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Recent Orders Table Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-36 bg-slate-800 rounded-md" />
          <div className="h-4 w-20 bg-slate-800/60 rounded" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
              </div>
              <div className="space-y-2 text-right">
                <div className="h-4 w-20 bg-slate-800 rounded ml-auto" />
                <div className="h-3 w-16 bg-slate-800/60 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
