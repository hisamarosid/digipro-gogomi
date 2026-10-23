/** "Denny Luthfi Bimantoro" -> "Denny L." — never expose a customer's full name publicly. */
export function maskName(raw: string | null | undefined): string {
  const parts = (raw || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Pelanggan';
  const first = parts[0].slice(0, 14);
  if (parts.length === 1) return first;
  return `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
