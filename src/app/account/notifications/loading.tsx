import React from 'react';

export default function CustomerNotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-slate-800 rounded-lg" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-md" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 bg-slate-900 border border-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Notifications List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-800 rounded" />
              <div className="h-3 w-2/3 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
