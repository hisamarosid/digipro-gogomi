'use client';

import React, { useEffect, useState } from 'react';
import { ProductGuideModal, GuideModalItem } from './ProductGuideModal';

interface FirstTimeGuideOrchestratorProps {
  orderNumber?: string;
  onRefresh?: () => void;
}

export function FirstTimeGuideOrchestrator({
  orderNumber,
  onRefresh,
}: FirstTimeGuideOrchestratorProps) {
  const [pendingItems, setPendingItems] = useState<GuideModalItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchPendingGuides = async () => {
    try {
      let url = '/api/account/products/guide/pending';
      if (orderNumber) {
        url += `?orderNumber=${encodeURIComponent(orderNumber)}`;
      }

      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data?.items) && json.data.items.length > 0) {
        setPendingItems(json.data.items);
        setIsOpen(true);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchPendingGuides();
  }, [orderNumber]);

  if (!isOpen || pendingItems.length === 0) return null;

  return (
    <ProductGuideModal
      items={pendingItems}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onAllAcknowledged={() => {
        setIsOpen(false);
        setPendingItems([]);
        if (onRefresh) onRefresh();
      }}
    />
  );
}
