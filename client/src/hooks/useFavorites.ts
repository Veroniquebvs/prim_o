/**
 * hooks/useFavorites.ts — Server-backed favorites list for the logged-in employee.
 *
 * Fetches the full favorites list from the API on mount. The toggle function performs an
 * optimistic UI update (removes or adds the entry immediately) then calls the API; if the
 * call fails the change is reverted so the UI stays consistent with the server state.
 *
 * isFavorite is a fast synchronous lookup derived from the in-memory list. count returns
 * the total number of favourited vouchers.
 */
import { useState, useEffect, useCallback } from 'react';
import { marketplaceService } from '../services/marketplace.service';

type FavoriteEntry = { voucher_id: string; created_at: string };

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceService.getFavorites()
      .then((data) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async (voucher_id: string) => {
    const safeFavs = Array.isArray(favorites) ? favorites : [];
    const wasFavorited = safeFavs.some((f) => f && f.voucher_id === voucher_id);
    // Optimistic update
    setFavorites((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      return wasFavorited
        ? prevArr.filter((f) => f && f.voucher_id !== voucher_id)
        : [{ voucher_id, created_at: new Date().toISOString() }, ...prevArr];
    });
    try {
      await marketplaceService.toggleFavorite(voucher_id);
    } catch {
      // Revert on error
      setFavorites((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        return wasFavorited
          ? [{ voucher_id, created_at: new Date().toISOString() }, ...prevArr]
          : prevArr.filter((f) => f && f.voucher_id !== voucher_id);
      });
    }
  }, [favorites]);

  const safeFavs = Array.isArray(favorites) ? favorites : [];

  return {
    favorites: safeFavs,
    loading,
    isFavorite: (id: string) => safeFavs.some((f) => f && f.voucher_id === id),
    toggle,
    count: safeFavs.length,
  };
}
