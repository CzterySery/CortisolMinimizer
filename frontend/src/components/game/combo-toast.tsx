export function ComboToast({ combos }: { combos: string[] }) {
  if (!combos.length) return null;
  return <div role="status" className="combo-toast">Combo: {combos.join(", ")}</div>;
}
