/**
 * utils/date.ts — Date formatting helpers for display throughout the frontend.
 *
 * All functions accept the raw string values returned by the API, which may arrive in
 * either ISO 8601 format ("2026-05-19T10:00:00Z") or the PostgreSQL default format
 * ("2026-05-19 10:00:00+00" — space instead of T). The internal normalise helper
 * converts the latter before parsing so both forms work reliably across JS engines.
 * Returns '—' for null, undefined, or unparseable inputs.
 *
 * fmt formats with a configurable Intl.DateTimeFormatOptions object (default: day/month/year).
 * fmtShort is a convenience wrapper using abbreviated month names.
 */

/**
 * Normalise une date PostgreSQL avant parsing.
 * PostgreSQL retourne parfois "2026-05-19 10:00:00+00" (espace au lieu du T)
 * que certains moteurs JS ne parsent pas. On remplace le premier espace par T.
 */
function normalise(date: string): string {
  // "2026-05-19 10:00:00…" → "2026-05-19T10:00:00…"
  return date.replace(' ', 'T');
}

export function fmt(
  date: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' },
): string {
  if (!date) return '—';
  const d = new Date(normalise(date));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', opts);
}

export function fmtShort(date: string | null | undefined): string {
  return fmt(date, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(normalise(date));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).replace(' ', ' à ');
}
