import React from 'react';

export default function CustomerSupportLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Hero Card Skeleton */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-800 rounded-full" />
            <div className="h-8 w-64 bg-slate-800 rounded-xl" />
            <div className="h-4 w-96 max-w-full bg-slate-800/60 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-slate-800 rounded-2xl" />
            <div className="h-10 w-36 bg-slate-800 rounded-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-950/60 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Two Column Master-Detail Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Skeleton */}
        <div className="lg:col-span-5 space-y-3">
          <div className="h-12 bg-slate-900 border border-slate-800 rounded-3xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-3xl border border-slate-800/80 bg-slate-900/50 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-slate-800 rounded" />
              <div className="h-3 w-32 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>

        {/* Right Detail Skeleton */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 min-h-[500px]">
            <div className="h-6 w-32 bg-slate-800 rounded" />
            <div className="h-8 w-64 bg-slate-800 rounded-xl" />
            <div className="h-4 w-48 bg-slate-800/60 rounded" />
            <div className="h-64 bg-slate-950/60 border border-slate-800 rounded-2xl mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
