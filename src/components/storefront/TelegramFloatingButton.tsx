'use client';

import React from 'react';

export function TelegramFloatingButton() {
  return (
    <a
      href="https://t.me/gogomistore"
      target="_blank"
      rel="noopener noreferrer"
      className="hidden md:flex fixed bottom-6 right-6 z-50 items-center justify-center p-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-110 active:scale-95 transition-all duration-300 group border border-sky-400/30"
      aria-label="Chat Telegram @gogomistore"
    >
      {/* Telegram SVG Icon */}
      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 fill-current text-white transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.96 1.25-5.54 3.67-.52.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.89 8.01-3.45 3.81-1.59 4.61-1.87 5.12-1.88.11 0 .36.03.52.16.14.12.18.28.2.45.02.07.02.16-.01.32z" />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
      </div>
    </a>
  );
}
