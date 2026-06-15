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
