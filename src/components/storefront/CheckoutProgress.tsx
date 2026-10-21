'use client';

import React from 'react';
import { Check, ShoppingBag, CreditCard, CheckCircle2 } from 'lucide-react';

interface CheckoutProgressProps {
  currentStep: 1 | 2 | 3;
}

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const steps = [
    { number: 1, label: 'Checkout', icon: ShoppingBag },
    { number: 2, label: 'Pembayaran', icon: CreditCard },
    { number: 3, label: 'Berhasil', icon: CheckCircle2 },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 mb-2">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />
        
        {/* Active Colored Connecting Line */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 -z-0 transition-all duration-500"
          style={{
            width:
              currentStep === 1
                ? '0%'
                : currentStep === 2
                ? '50%'
                : 'calc(100% - 3rem)',
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep || (currentStep === 3 && step.number === 3);
          const isActive = step.number === currentStep;
          const isUpcoming = step.number > currentStep;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center gap-1.5 relative z-10 select-none">
              <div
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-md ${
                  isCompleted
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 ring-4 ring-slate-950'
                    : isActive
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 shadow-cyan-500/30 scale-110 font-extrabold'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 ring-4 ring-slate-950'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <span
                className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : isCompleted
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
