const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value) => inr.format(Number(value ?? 0));

// Whole rupees without ".00" (₹20,000), paise only when there are some (₹840.50)
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export const formatAmount = (value) => inrCompact.format(Number(value ?? 0));

export const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export const monthRange = (ym) => ({ from: `${ym}-01`, to: `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}` });

// "Today · Tue 27 Oct", "Yesterday · Mon 26 Oct", "Sun 25 Oct"
export const dayHeading = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = todayIso();
  const yesterday = (() => {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  })();
  if (iso === today) return `Today · ${label}`;
  if (iso === yesterday) return `Yesterday · ${label}`;
  return label;
};

export const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Local "today" in yyyy-MM-dd (not UTC, so it's correct in India late at night)
export const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonth = () => todayIso().slice(0, 7);

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// A stable color per category id, like layer colors on a design canvas
const SWATCHES = [
  '#ff6b4a', // coral
  '#8b5cf6', // violet
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#ef4444', // red
  '#84cc16', // lime
];

export const categoryColor = (id) => SWATCHES[(Number(id) || 0) % SWATCHES.length];
