'use client';

import React from 'react';
import { renderSafeMarkdownToHtml } from '@/lib/utils/sanitizer';

interface SanitizedGuideViewerProps {
  content?: string | null;
  emptyPlaceholder?: string;
  className?: string;
}

export function SanitizedGuideViewer({
  content,
  emptyPlaceholder = 'Belum ada panduan yang ditambahkan.',
  className = '',
}: SanitizedGuideViewerProps) {
  if (!content || !content.trim()) {
    return (
      <div className={`p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-500 italic ${className}`}>
        {emptyPlaceholder}
      </div>
    );
  }

  const sanitizedHtml = renderSafeMarkdownToHtml(content);

  return (
    <div
      className={`prose prose-invert max-w-none text-xs leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
