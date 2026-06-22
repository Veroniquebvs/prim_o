/**
 * utils/imageUrl.ts — Resolves voucher image URLs for use in <img> tags.
 *
 * Voucher images are stored as either a full external URL (e.g. a CDN link) or a relative
 * path under /uploads/ served by the backend. This helper ensures both cases render correctly
 * by prefixing relative paths with the API base URL (VITE_API_URL env var, falling back to
 * localhost:5000 in development).
 */
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

/**
 * Résout l'URL d'une image de bon d'achat.
 * - URL absolue (http/https) ou data-URI → renvoyée telle quelle
 * - Chemin relatif (`/uploads/...`) → préfixé par l'URL de l'API
 */
export function resolveImageUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
  return `${API_URL}${src}`;
}
