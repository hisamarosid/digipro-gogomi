import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { WishlistService } from '@/services/wishlist.service';
import { CustomerWishlistClient } from './CustomerWishlistClient';

export const dynamic = 'force-dynamic';

export default async function CustomerWishlistPage() {
  const session = await requireAuth();
  const wishlistItems = await WishlistService.getUserWishlist(session.userId);

  return <CustomerWishlistClient initialItems={wishlistItems} />;
}

