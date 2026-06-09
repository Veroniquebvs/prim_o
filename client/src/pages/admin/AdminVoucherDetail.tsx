import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplace.service';
import { VOUCHER_CATEGORIES } from '../../types';
import type { Voucher, VoucherCategory } from '../../types';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export default function AdminVoucherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [voucher, setVoucher]   = useState<Voucher | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featureSaving, setFeatureSaving] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  /* form fields */
  const [partner, setPartner]     = useState('');
  const [title, setTitle]         = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [cost, setCost]           = useState('');
  const [category, setCategory] = useState<VoucherCategory | ''>('');
  const [available, setAvailable] = useState(true);
  const [images, setImages]     = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    marketplaceService.getItemById(id)
      .then(v => {
        setVoucher(v);
        setPartner(v.partner);
        setTitle(v.title);
        setPromoCode(v.promo_code ?? '');
        setCost(String(v.token_cost));
        setCategory(v.category ?? '');
        setAvailable(v.available);
        setImages(v.images ?? []);
        setIsFeatured(v.is_featured ?? false);
      })
      .catch(() => setError('Impossible de charger le bon.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const added = Array.from(selected);
    setNewFiles(prev => [...prev, ...added].slice(0, 5 - images.length));
    setNewPreviews(prev => [...prev, ...added.map(f => URL.createObjectURL(f))].slice(0, 5 - images.length));
  }

  function removeExisting(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  function removeNew(index: number) {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !category) return;
    setError(''); setSuccess('');
    setSaving(true);
    try {
      let uploaded: string[] = [];
      if (newFiles.length > 0) {
        uploaded = await marketplaceService.uploadImages(newFiles);
      }
      await marketplaceService.updateItem(id, {
        partner: partner.trim(),
        title: title.trim(),
        promo_code: promoCode.trim(),
        token_cost: Number(cost),
        category: category as VoucherCategory,
        available,
        images: [...images, ...uploaded],
      });
      setNewFiles([]); setNewPreviews([]);
      setSuccess('Bon mis à jour.');
    } catch {
      setError('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFeatureToggle() {
    if (!id) return;
    const next = !isFeatured;
    setIsFeatured(next);
    setFeatureSaving(true);
    try {
      await marketplaceService.updateItem(id, { is_featured: next });
    } catch {
      setIsFeatured(!next);
    } finally {
      setFeatureSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Supprimer ce bon définitivement ?')) return;
    try {
      await marketplaceService.deleteItem(id);
      navigate('/admin/bons');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>;
  if (!voucher) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Bon introuvable.</div>;

  const totalImages = images.length + newPreviews.length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>{voucher.partner}</h1>
          <p>{voucher.title}</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/admin/bons')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div style={{ maxWidth: 560, paddingBottom: 48 }}>
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Informations</p>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Partenaire</label>
                <input className="form-input" value={partner} onChange={e => setPartner(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Titre</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Code promo partenaire</label>
              <input className="form-input" value={promoCode} onChange={e => setPromoCode(e.target.value)} required placeholder="ex : FNAC20" />
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Coût en tokens</label>
                <input className="form-input" type="number" min="1" value={cost} onChange={e => setCost(e.target.value)} required />
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Disponibilité</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {[true, false].map(val => (
                  <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" name="available" checked={available === val} onChange={() => setAvailable(val)} />
                    {val ? 'Disponible' : 'Indisponible'}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>
              Photos ({totalImages}/5)
            </p>

            {/* Images existantes */}
            {(images.length > 0 || newPreviews.length > 0) && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {images.map((url, i) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <img src={`${API_URL}${url}`} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => removeExisting(i)} style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      borderRadius: '50%', background: '#dc2626', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px dashed var(--primary)' }} />
                    <button type="button" onClick={() => removeNew(i)} style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      borderRadius: '50%', background: '#dc2626', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {totalImages < 5 && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', border: '2px dashed var(--border)',
                borderRadius: 'var(--radius)', cursor: 'pointer',
                fontSize: '0.875rem', color: 'var(--text-muted)',
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
                Ajouter des photos
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
              </label>
            )}
          </div>

          {/* Mise en avant favoris */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                  ❤️ Ajouter à l'onglet favoris
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isFeatured
                    ? 'Ce bon apparaît dans le carousel Favoris.'
                    : 'Ce bon n\'apparaît pas dans le carousel Favoris.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFeatureToggle}
                disabled={featureSaving}
                aria-pressed={isFeatured}
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  border: 'none',
                  cursor: featureSaving ? 'wait' : 'pointer',
                  background: isFeatured ? 'var(--primary)' : 'var(--border)',
                  transition: 'background 0.2s',
                  position: 'relative',
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  left: isFeatured ? 27 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                  display: 'block',
                }} />
              </button>
            </div>
          </div>

          {error   && <p className="form-error"   style={{ marginBottom: 12 }}>{error}</p>}
          {success && <p className="form-success" style={{ marginBottom: 12 }}>{success}</p>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={handleDelete}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '0 18px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              Supprimer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
