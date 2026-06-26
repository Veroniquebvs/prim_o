/**
 * hooks/useCart.ts — Client-side voucher cart backed by localStorage, scoped per user.
 *
 * Persists the cart as a JSON array under the key `primo_cart_<userId>` so that each user's
 * cart survives page reloads. Handles a legacy migration from old carts stored as plain string[]
 * (each entry is converted to the current CartItem shape on read). When the user changes (e.g.
 * logout/login), the hook re-initialises from the new user's storage key.
 *
 * toggle adds a voucher if absent, removes it if already present. remove always removes.
 * count, isInCart, and addedAt are convenience read-only accessors.
 *
 * The cart is purely client-side; redemption is performed server-side by the Panier page.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface CartItem {
  id: string;
  added_at: string;
}

function cartKey(userId: string) {
  return `primo_cart_${userId}`;
}

function parseSaved(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migration: support anciens paniers stockés comme string[] ou objets corrompus
    return parsed
      .filter((entry): entry is any => entry !== null && entry !== undefined)
      .map((entry: any) =>
        typeof entry === 'string'
          ? { id: entry, added_at: new Date().toISOString() }
          : { id: entry.id || '', added_at: entry.added_at || new Date().toISOString() }
      )
      .filter((item) => !!item.id);
  } catch {
    return [];
  }
}

export function useCart() {
  const { user } = useAuth();
  const key = user?.id ? cartKey(user.id) : null;

  const [saved, setSaved] = useState<CartItem[]>(() => {
    if (!key) return [];
    try {
      return parseSaved(localStorage.getItem(key) ?? '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!key) { setSaved([]); return; }
    try {
      setSaved(parseSaved(localStorage.getItem(key) ?? '[]'));
    } catch {
      setSaved([]);
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(saved));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [saved, key]);

  function toggle(id: string) {
    setSaved((prev) =>
      prev.some((v) => v.id === id)
        ? prev.filter((v) => v.id !== id)
        : [...prev, { id, added_at: new Date().toISOString() }],
    );
  }

  function remove(id: string) {
    setSaved((prev) => prev.filter((v) => v.id !== id));
  }

  return {
    saved,
    toggle,
    remove,
    isInCart: (id: string) => saved.some((v) => v.id === id),
    addedAt: (id: string) => saved.find((v) => v.id === id)?.added_at,
    count: saved.length,
  };
}
