import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplace.service';
import { VOUCHER_CATEGORIES } from '../../types';
import type { AdminVoucher, VoucherCategory } from '../../types';
import { resolveImageUrl } from '../../utils/imageUrl';

/* ── Onglet Gérer ── */
function OngletGerer() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [partner, setPartner]     = useState('');
  const [title, setTitle]         = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [cost, setCost]           = useState('');
  const [category, setCategory]   = useState<VoucherCategory | ''>('');
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    marketplaceService.adminGetVouchers().then(setVouchers).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const added = Array.from(selected);
    setFiles(prev => [...prev, ...added].slice(0, 5));
    setPreviews(prev => [...prev, ...added.map(f => URL.createObjectURL(f))].slice(0, 5));
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!partner.trim() || !title.trim() || !promoCode.trim() || !cost || !category) return;
    setSaving(true);
    try {
      let images: string[] = [];
      if (files.length > 0) {
        images = await marketplaceService.uploadImages(files);
      }
      await marketplaceService.createItem({
        partner: partner.trim(),
        title: title.trim(),
        promo_code: promoCode.trim(),
        token_cost: Number(cost),
        category: category as VoucherCategory,
        images,
      });
      setSuccess('Bon ajouté avec succès.');
      setPartner(''); setTitle(''); setPromoCode(''); setCost(''); setCategory('');
      setFiles([]); setPreviews([]);
      load();
    } catch {
      setError("Erreur lors de l'ajout du bon.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce bon définitivement ?')) return;
    try {
      await marketplaceService.deleteItem(id);
      load();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  }

  async function handleToggle(v: AdminVoucher) {
    try {
      await marketplaceService.updateItem(v.id, { available: !v.available });
      load();
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  }

  if (loading) return <p className="empty-state">Chargement…</p>;

  return (
    <div>
      {/* Formulaire d'ajout */}
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Ajouter un bon d'achat</p>
        <form onSubmit={handleAdd}>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Partenaire</label>
              <input className="form-input" placeholder="Fnac, Amazon…" value={partner} onChange={e => setPartner(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Titre</label>
              <input className="form-input" placeholder="Bon d'achat 20 €" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Code promo partenaire</label>
            <input className="form-input" placeholder="ex : FNAC20, AMAZON10OFF…" value={promoCode} onChange={e => setPromoCode(e.target.value)} required />
          </div>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Coût en tokens</label>
              <input className="form-input" type="number" min="1" placeholder="100" value={cost} onChange={e => setCost(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catégorie</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value as VoucherCategory | '')} required>
                <option value="">— Choisir —</option>
                {VOUCHER_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Zone upload images */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Photos (5 max, jpg/png/webp)</label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius)', cursor: 'pointer',
              fontSize: '0.875rem', color: 'var(--text-muted)',
              transition: 'border-color 0.15s',
            }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = ''; handleFiles(e.dataTransfer.files); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Cliquer ou déposer des images
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </label>

            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => removeFile(i)} style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#dc2626', color: '#fff', border: 'none',
                      cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error   && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Ajout…' : '+ Ajouter'}
          </button>
        </form>
      </div>

      {/* Liste des bons */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
            {vouchers.length} bon{vouchers.length > 1 ? 's' : ''} au total
          </p>
          <input
            className="form-input"
            placeholder="Rechercher partenaire, titre, code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 260, marginBottom: 0 }}
          />
        </div>
        {vouchers.length === 0 ? (
          <p className="empty-state">Aucun bon enregistré.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Partenaire</th>
                  <th>Titre</th>
                  <th>Code promo</th>
                  <th>Catégorie</th>
                  <th>Tokens</th>
                  <th>Rachats</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...vouchers]
                  .filter(v => {
                    const q = search.toLowerCase();
                    return !q
                      || v.partner.toLowerCase().includes(q)
                      || v.title.toLowerCase().includes(q)
                      || (v.promo_code ?? '').toLowerCase().includes(q);
                  })
                  .sort((a, b) => a.partner.localeCompare(b.partner, 'fr')).map(v => (
                  <tr key={v.id} onClick={() => navigate(`/admin/bons/${v.id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ width: 48 }}>
                      {v.images?.[0] ? (
                        <img
                          src={resolveImageUrl(v.images[0])}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18, color: 'var(--text-muted)' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.partner}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{v.title}</td>
                    <td>
                      {v.promo_code
                        ? <span className="promo-code">{v.promo_code}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {v.category ? v.category.charAt(0).toUpperCase() + v.category.slice(1) : '—'}
                    </td>
                    <td><span className="token-badge">{v.token_cost}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{v.redemptions?.length ?? 0}</td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggle(v); }}
                        style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                          borderRadius: 999, border: 'none', cursor: 'pointer',
                          background: v.available ? '#dcfce7' : '#fee2e2',
                          color: v.available ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {v.available ? 'Disponible' : 'Indispo'}
                      </button>
                    </td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); handleDelete(v.id); }} className="btn btn-danger btn-sm">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function AdminBons() {
  const navigate = useNavigate();

  return (
    <div>
      <style>{`
        .page-header .back-btn {
          position: absolute !important;
          right: 24px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background-color: transparent !important;
          color: white !important;
          border-color: white !important;
        }
        @media (min-width: 768px) {
          .page-header .back-btn {
            right: 32px !important;
          }
        }
        @media (min-width: 1024px) {
          .page-header .back-btn {
            right: 40px !important;
          }
        }
        .page-header .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <div className="page-header">
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1>Bons d'achat</h1>
          <p>Gestion du catalogue</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <OngletGerer />
    </div>
  );
}
