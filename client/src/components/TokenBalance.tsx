/**
 * components/TokenBalance.tsx — Stat card displaying the logged-in employee's current token balance.
 *
 * Reads the balance directly from AuthContext, so it reflects the latest refresh of the user object.
 * Intended for use on employee-facing pages such as the wallet/dashboard area.
 */
import { useAuth } from '../context/AuthContext';

export default function TokenBalance() {
  const { user } = useAuth();

  return (
    <div className="stat-card">
      <p className="stat-label">Mes tokens</p>
      <p className="stat-value">{user?.token_balance ?? 0}</p>
      <p className="stat-sub">disponibles à l'échange</p>
    </div>
  );
}
