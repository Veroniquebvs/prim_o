/**
 * Formats a token amount for display. Strips trailing zeros so 100.00 → "100"
 * and keeps significant decimals so 10.75 → "10.75".
 * Accepts number or string (Sequelize returns DECIMAL columns as strings).
 */
export const formatTokens = (n: number | string | null | undefined): string => {
  if (n == null) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0';
  if (num % 1 === 0) return String(Math.round(num));
  return parseFloat(num.toFixed(2)).toString();
};
