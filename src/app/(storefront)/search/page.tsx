import React from 'react';
import ProductsCatalogPage from '../products/page';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return <ProductsCatalogPage searchParams={searchParams} />;
}
