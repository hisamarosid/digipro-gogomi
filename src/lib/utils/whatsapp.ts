/** Normalises an Indonesian number ("0812...", "+62 812...", "62812...") to digits with the 62 prefix. */
export function normalizeWhatsappNumber(raw: string | null | undefined): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function buildWhatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = normalizeWhatsappNumber(phone);
  if (number.length < 9) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** A product is a "service" (ordered via chat first) when its variants are delivered manually. */
export function isServiceProduct(variants: Array<{ deliveryModel?: string | null; deliveryType?: string | null }> | undefined): boolean {
  if (!variants || variants.length === 0) return false;
  return variants.every((v) => v.deliveryModel === 'MANUAL' || (!v.deliveryModel && v.deliveryType === 'MANUAL'));
}
