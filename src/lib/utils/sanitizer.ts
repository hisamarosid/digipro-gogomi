/**
 * Sanitizer and safe Markdown-to-HTML parser for Customer Guides (Tutorials & Terms)
 * Zero dependency, XSS-proof, and designed for safe customer rendering.
 */

export function sanitizePlainText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes a URL to prevent javascript: or data: XSS schemes
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '#';
  }
  return trimmed;
}

/**
 * Converts safe markdown text into sanitized, structured HTML for customer rendering.
 * Supports:
 * - H1, H2, H3
 * - Bold (**bold**)
 * - Italic (*italic*)
 * - Numbered lists (1. 2. 3.)
 * - Bullet lists (- or *)
 * - Hyperlinks ([text](url)) with forced rel="noopener noreferrer" and target="_blank"
 * - Callout quotes (> Note)
 * - Paragraph breaks
 */
export function renderSafeMarkdownToHtml(markdown: string | null | undefined): string {
  if (!markdown || typeof markdown !== 'string') return '';

  const lines = markdown.split('\n');
  const result: string[] = [];
  let inNumberedList = false;
  let inBulletList = false;

  const closeLists = () => {
    if (inNumberedList) {
      result.push('</ol>');
      inNumberedList = false;
    }
    if (inBulletList) {
      result.push('</ul>');
      inBulletList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    // Callout / Blockquote: > Note
    if (trimmed.startsWith('>')) {
      closeLists();
      const quoteText = parseInlineMarkdown(trimmed.replace(/^>\s*/, ''));
      result.push(
        `<div class="my-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <span class="text-amber-400 font-bold shrink-0">💡</span>
          <div class="leading-relaxed">${quoteText}</div>
        </div>`
      );
      continue;
    }

    // Heading 1: # Title
    if (trimmed.startsWith('# ')) {
      closeLists();
      const content = parseInlineMarkdown(trimmed.substring(2));
      result.push(`<h2 class="text-base font-black text-white mt-5 mb-2 pb-1 border-b border-slate-800">${content}</h2>`);
      continue;
    }

    // Heading 2: ## Title
    if (trimmed.startsWith('## ')) {
      closeLists();
      const content = parseInlineMarkdown(trimmed.substring(3));
      result.push(`<h3 class="text-sm font-extrabold text-cyan-300 mt-4 mb-1.5 flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span><span>${content}</span></h3>`);
      continue;
    }

    // Heading 3: ### Title
    if (trimmed.startsWith('### ')) {
      closeLists();
      const content = parseInlineMarkdown(trimmed.substring(4));
      result.push(`<h4 class="text-xs font-bold text-slate-200 mt-3 mb-1">${content}</h4>`);
      continue;
    }

    // Numbered List: 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (inBulletList) {
        result.push('</ul>');
        inBulletList = false;
      }
      if (!inNumberedList) {
        result.push('<ol class="my-2 space-y-2 list-none pl-0">');
        inNumberedList = true;
      }
      const num = numMatch[1];
      const itemContent = parseInlineMarkdown(numMatch[2]);
      result.push(
        `<li class="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
          <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/40 mt-0.5">${num}</span>
          <div class="flex-1">${itemContent}</div>
        </li>`
      );
      continue;
    }

    // Bullet List: - Item or * Item
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (inNumberedList) {
        result.push('</ol>');
        inNumberedList = false;
      }
      if (!inBulletList) {
        result.push('<ul class="my-2 space-y-1.5 list-none pl-0">');
        inBulletList = true;
      }
      const itemContent = parseInlineMarkdown(bulletMatch[1]);
      result.push(
        `<li class="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-2"></span>
          <div class="flex-1">${itemContent}</div>
        </li>`
      );
      continue;
    }

    // Standard Paragraph
    closeLists();
    const paraContent = parseInlineMarkdown(trimmed);
    result.push(`<p class="text-xs text-slate-300 leading-relaxed my-2">${paraContent}</p>`);
  }

  closeLists();
  return result.join('\n');
}

/**
 * Formats inline bold, italic, and safe links
 */
function parseInlineMarkdown(text: string): string {
  if (!text) return '';

  // 1. Escape HTML entities first
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Bold: **text** or __text__
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
  safe = safe.replace(/__(.*?)__/g, '<strong class="text-white font-bold">$1</strong>');

  // 3. Italic: *text* or _text_
  safe = safe.replace(/\*(.*?)\*/g, '<em class="text-slate-200 italic">$1</em>');
  safe = safe.replace(/_(.*?)_/g, '<em class="text-slate-200 italic">$1</em>');

  // 4. Code: `code`
  safe = safe.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[11px]">$1</code>'
  );

  // 5. Links: [label](url)
  safe = safe.replace(/\[(.*?)\]\((.*?)\)/g, (_match, label, url) => {
    const cleanUrl = sanitizeUrl(url);
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition inline-flex items-center gap-0.5">${label} ↗</a>`;
  });

  return safe;
}
