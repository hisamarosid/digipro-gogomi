'use client';

import React from 'react';
import Image from 'next/image';

interface GogomiLogoProps {
  className?: string;
  height?: number;
  width?: number;
  variant?: 'full' | 'icon' | 'badge';
}

export function GogomiLogo({ className = 'h-9 w-auto', height = 36 }: GogomiLogoProps) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <img
        src="/gogomi-logo.png"
        alt="Gogomi Digital Store Logo"
        className="h-full w-auto object-contain transition-transform group-hover:scale-105"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
