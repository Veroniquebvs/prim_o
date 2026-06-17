/**
 * components/TotalTokenBalance.tsx — Stat card showing an employer's or manager's remaining
 * token distribution budget.
 *
 * Receives the balance as a prop rather than reading from AuthContext so the parent page
 * can pass either the company pool (for employers) or the manager's allocated budget.
 */
interface Props {
  balance: number;
}

export default function TotalTokenBalance({ balance }: Props) {
  return (
    <div className="stat-card">
      <p className="stat-label">Budget distribution</p>
      <p className="stat-value">{balance}</p>
      <p className="stat-sub">tokens à allouer</p>
    </div>
  );
}
