import React from 'react';

export default function CustomerProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-md" />
      </div>

      {/* Profile Form Card Skeleton */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/50 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-10 w-full bg-slate-950/60 border border-slate-800 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-10 w-full bg-slate-950/60 border border-slate-800 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-10 w-full bg-slate-950/60 border border-slate-800 rounded-xl" />
        </div>
        <div className="pt-2">
          <div className="h-10 w-36 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
