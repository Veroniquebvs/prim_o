/**
 * components/Pager.tsx — Shared client-side pagination for list/table views.
 *
 * paginate() slices an already-filtered/sorted array into one page; Pager renders the
 * page-number controls. Both clamp to a valid page automatically when the underlying
 * data shrinks (e.g. after a filter change), so callers don't need to guard against
 * an out-of-range page themselves.
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { slice, totalPages, safePage };
}

export function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0 4px' }}>
      <button className="btn btn-outline btn-sm" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            minWidth: 32, height: 32, borderRadius: 8, border: '1.5px solid',
            borderColor: n === page ? 'var(--primary)' : 'var(--border)',
            background: n === page ? 'var(--primary)' : 'transparent',
            color: n === page ? '#fff' : 'var(--text)',
            fontWeight: n === page ? 700 : 400,
            fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
        ›
      </button>
    </div>
  );
}
