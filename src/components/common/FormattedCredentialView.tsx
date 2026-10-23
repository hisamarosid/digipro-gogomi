'use client';

import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { parseCredential } from '@/lib/utils/credential-parser';

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

/**
 * Shows a credential split into separate fields (Email, Password, PIN, ...), each with its own
 * copy button. Text that has no recognisable structure falls back to the plain formatted view.
 */
export function CredentialFieldsView({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  const fields = parseCredential(content);
  if (fields.length === 0) {
    return <FormattedCredentialView content={content} className={className} />;
  }

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`);
  };

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      {fields.map((field, index) => (
        <div
          key={`${field.label}-${index}`}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5"
        >
          <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {field.label}
          </span>
          <span className="min-w-0 flex-1 select-all break-all font-mono text-xs font-bold text-cyan-300">
            {field.kind === 'link' ? <FormattedCredentialView content={field.value} /> : field.value}
          </span>
          <button
            type="button"
            onClick={() => copy(field.value, field.label)}
            className="shrink-0 rounded p-1 text-slate-400 transition hover:text-white"
            title={`Salin ${field.label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
