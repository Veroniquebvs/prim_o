import { Voucher } from '../types';

export function getCategory(v: Voucher): string {
  return v.category
    ? v.category.charAt(0).toUpperCase() + v.category.slice(1)
    : 'Autres';
}

export const getCategoryColor = (cat: string) => {
  const normalizedCat = cat.toLowerCase().trim();
  const colorMap: Record<string, { light: string; dark: string }> = {
    'tous': { light: '#e0f2fe', dark: '#0284c7' }, // Bleu
    'sport': { light: '#dcfce7', dark: '#16a34a' }, // Vert
    'voyage': { light: '#f3e8ff', dark: '#9333ea' }, // Violet
    'culture': { light: '#ffedd5', dark: '#ea580c' }, // Orange
    'nourriture': { light: '#fef9c3', dark: '#ca8a04' }, // Jaune
    'loisirs': { light: '#ccfbf1', dark: '#0d9488' }, // Teal
    'tech': { light: '#fee2e2', dark: '#dc2626' }, // Rouge
    'services': { light: '#e0e7ff', dark: '#4f46e5' }, // Indigo
    'shopping': { light: '#fce7f3', dark: '#db2777' }, // Rose
    'bien-être': { light: '#cffafe', dark: '#0891b2' }, // Cyan
  };

  return colorMap[normalizedCat] || { light: '#f1f5f9', dark: '#475569' }; // Gris par défaut
};
