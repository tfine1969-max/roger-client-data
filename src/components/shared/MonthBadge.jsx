export default function MonthBadge({ month }) {
  if (!month) return null;
  const [y, m] = month.split('-');
  const label = new Date(+y, +m - 1, 1).toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
      {label}
    </span>
  );
}