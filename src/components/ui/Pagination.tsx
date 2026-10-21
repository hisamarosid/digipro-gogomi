'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis for large totalPages
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400">
      
      {/* Items Range Info & Items Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Menampilkan <strong className="text-white font-bold">{startItem}-{endItem}</strong> dari <strong className="text-white font-bold">{totalItems}</strong> data
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800/80 pl-3">
            <span className="text-[11px]">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="rounded-xl bg-[#080b11] border border-slate-800 text-white px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 font-bold"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Circular Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Halaman Pertama"
          className="w-8 h-8 rounded-full border border-slate-800 bg-[#080b11] text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Halaman Sebelumnya"
          className="w-8 h-8 rounded-full border border-slate-800 bg-[#080b11] text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 font-bold">
                  ...
                </span>
              );
            }
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-full font-bold transition flex items-center justify-center text-xs ${
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/20'
                    : 'border border-slate-800 bg-[#080b11] text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Halaman Selanjutnya"
          className="w-8 h-8 rounded-full border border-slate-800 bg-[#080b11] text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Halaman Terakhir"
          className="w-8 h-8 rounded-full border border-slate-800 bg-[#080b11] text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}
