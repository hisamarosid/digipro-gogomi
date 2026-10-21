'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0] : null;
}

export function FormattedCredentialView({
  content,
  className = 'text-xs text-cyan-300 font-mono whitespace-pre-wrap break-all',
  linkClassName = 'text-cyan-400 hover:text-cyan-200 underline font-bold transition inline-flex items-center gap-1',
}: {
  content: string;
  className?: string;
  linkClassName?: string;
}) {
  if (!content) return null;

  const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
  const parts = content.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <ExternalLink className="h-3 w-3 inline shrink-0" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
