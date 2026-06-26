/**
 * components/CategoryFilter.tsx — Full-text search input for filtering the voucher catalogue.
 *
 * Despite its name the component is a free-text search field, not a category picker.
 * The parent page is responsible for filtering the voucher list against the value string.
 * value holds the current query and onChange is called on every keystroke.
 */
interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="form-group" style={{ maxWidth: 340, marginBottom: 24 }}>
      <input
        className="form-input"
        type="search"
        placeholder="Rechercher un bon d'achat…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
