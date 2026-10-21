'use client';

import React, { useState, useRef } from 'react';
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  ListOrdered,
  List,
  Link as LinkIcon,
  Lightbulb,
  Eye,
  Edit3,
} from 'lucide-react';
import { SanitizedGuideViewer } from '../common/SanitizedGuideViewer';

interface RichMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function RichMarkdownEditor({
  value,
  onChange,
  placeholder = 'Tulis panduan atau syarat & ketentuan di sini...',
  rows = 8,
  label,
  helperText,
  required,
}: RichMarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultText;

    const newText =
      currentText.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentText.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleInsertHeading2 = () => insertFormatting('## ', '\n', 'Judul Bagian');
  const handleInsertHeading3 = () => insertFormatting('### ', '\n', 'Sub-Judul');
  const handleInsertBold = () => insertFormatting('**', '**', 'teks tebal');
  const handleInsertItalic = () => insertFormatting('*', '*', 'teks miring');
  const handleInsertNumbered = () => insertFormatting('1. ', '\n', 'Langkah pertama');
  const handleInsertBullet = () => insertFormatting('- ', '\n', 'Poin penting');
  const handleInsertLink = () => insertFormatting('[', '](https://example.com)', 'Nama Tautan');
  const handleInsertCallout = () => insertFormatting('> ', '\n', 'Catatan penting atau tips bagi pembeli');

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-rose-400">*</span>}
          </label>
          {helperText && <span className="text-[10px] text-slate-400">{helperText}</span>}
        </div>
      )}

      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner focus-within:border-cyan-500/80 transition">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 gap-2">
          {/* Format Buttons */}
          <div className="flex flex-wrap items-center gap-1 text-slate-300">
            <button
              type="button"
              onClick={handleInsertHeading2}
              title="Heading 2 (##)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <Heading2 className="h-3.5 w-3.5 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={handleInsertHeading3}
              title="Heading 3 (###)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <Heading3 className="h-3.5 w-3.5 text-cyan-400" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={handleInsertBold}
              title="Tebal (**teks**)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition"
            >
              <Bold className="h-3.5 w-3.5 text-slate-300" />
            </button>

            <button
              type="button"
              onClick={handleInsertItalic}
              title="Miring (*teks*)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition"
            >
              <Italic className="h-3.5 w-3.5 text-slate-300" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={handleInsertNumbered}
              title="Daftar Nomor (1. 2. 3.)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <ListOrdered className="h-3.5 w-3.5 text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={handleInsertBullet}
              title="Daftar Poin (- atau *)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <List className="h-3.5 w-3.5 text-emerald-400" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={handleInsertLink}
              title="Sisipkan Tautan ([label](url))"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <LinkIcon className="h-3.5 w-3.5 text-blue-400" />
            </button>

            <button
              type="button"
              onClick={handleInsertCallout}
              title="Catatan / Highlight (> Note)"
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            </button>
          </div>

          {/* Write / Preview Tab Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                activeTab === 'write'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="h-3 w-3" />
              <span>Tulis</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                activeTab === 'preview'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Editor Body */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-transparent p-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono leading-relaxed resize-y"
          />
        ) : (
          <div className="p-4 bg-slate-950 min-h-[160px] max-h-[380px] overflow-y-auto">
            <SanitizedGuideViewer
              content={value}
              emptyPlaceholder="Ketik teks pada tab 'Tulis' untuk melihat hasil live preview di sini."
            />
          </div>
        )}
      </div>
    </div>
  );
}
