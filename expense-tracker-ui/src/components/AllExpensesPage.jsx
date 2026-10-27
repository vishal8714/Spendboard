import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { currentMonth, formatAmount, formatDate, monthRange, shiftMonth, todayIso } from '../utils.js';
import CategoryChip from './CategoryChip.jsx';
import { IconChevronDown, IconSearch, IconTrash, IconX } from './Icons.jsx';

const SORTS = {
  'date-desc': { label: 'Newest first', compare: (a, b) => b.date.localeCompare(a.date) || b.id - a.id },
  'date-asc': { label: 'Oldest first', compare: (a, b) => a.date.localeCompare(b.date) || a.id - b.id },
  'amount-desc': { label: 'Amount: high to low', compare: (a, b) => b.amount - a.amount || b.id - a.id },
  'amount-asc': { label: 'Amount: low to high', compare: (a, b) => a.amount - b.amount || a.id - b.id },
};

// Quick date ranges; "All time" clears both dates
function presetRange(id) {
  const month = currentMonth();
  switch (id) {
    case 'this-month':
      return monthRange(month);
    case 'last-month':
      return monthRange(shiftMonth(month, -1));
    case 'last-3':
      return { from: monthRange(shiftMonth(month, -2)).from, to: todayIso() };
    case 'this-year':
      return { from: `${month.slice(0, 4)}-01-01`, to: todayIso() };
    default:
      return { from: '', to: '' };
  }
}

const PRESETS = [
  { id: 'all', label: 'All time' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-3', label: 'Last 3 months' },
  { id: 'this-year', label: 'This year' },
];

const PAGE_SIZE = 100;

export default function AllExpensesPage({ categories, notify }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [confirmId, setConfirmId] = useState(null);

  const rangeError = range.from && range.to && range.from > range.to ? '“From” must be on or before “To”' : '';

  // Date range and category are filtered on the server; search and sort happen here
  const load = useCallback(async () => {
    if (rangeError) return;
    setLoading(true);
    setLoadError('');
    try {
      setExpenses(await api.listExpenses({ ...range, categoryId }));
    } catch (err) {
      setLoadError(err.message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [range, categoryId, rangeError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setShown(PAGE_SIZE), [range, categoryId, search, sort]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? expenses.filter(
          (e) => e.description.toLowerCase().includes(q) || e.category.name.toLowerCase().includes(q)
        )
      : expenses;
    return [...list].sort((a, b) => SORTS[sort].compare(
      { ...a, amount: Number(a.amount) },
      { ...b, amount: Number(b.amount) }
    ));
  }, [expenses, search, sort]);

  const total = useMemo(() => rows.reduce((s, e) => s + Number(e.amount), 0), [rows]);
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.id);
    return r.from === range.from && r.to === range.to;
  })?.id;
  const filtersActive = range.from || range.to || categoryId || search;

  // Clicking a column header: first click sorts high→low / newest, a second click flips it
  function sortBy(field) {
    setSort((s) => (s === `${field}-desc` ? `${field}-asc` : `${field}-desc`));
  }
  const arrow = (field) => (sort === `${field}-desc` ? '↓' : sort === `${field}-asc` ? '↑' : '');

  async function remove(id) {
    try {
      await api.deleteExpense(id);
      notify('success', 'Expense deleted');
      setConfirmId(null);
      load();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-head">
          <h1 className="page-title">All expenses</h1>
          <label className="search">
            <IconSearch width={16} height={16} />
            <input
              type="search"
              placeholder="Search expenses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search expenses"
            />
          </label>
        </div>

        <section className="card ae-filters">
          <div className="ae-presets" role="group" aria-label="Date range">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset ${activePreset === p.id ? 'is-active' : ''}`}
                aria-pressed={activePreset === p.id}
                onClick={() => setRange(presetRange(p.id))}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="ae-controls">
            <label className="ae-field">
              <span>From</span>
              <input
                type="date"
                max={range.to || todayIso()}
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </label>
            <label className="ae-field">
              <span>To</span>
              <input
                type="date"
                min={range.from || undefined}
                max={todayIso()}
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </label>
            <label className="ae-field">
              <span>Category</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ae-field">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {filtersActive && (
              <button
                className="btn btn-ghost ae-clear"
                onClick={() => {
                  setRange({ from: '', to: '' });
                  setCategoryId('');
                  setSearch('');
                }}
              >
                <IconX width={14} height={14} /> Clear filters
              </button>
            )}
          </div>
          {rangeError && <p className="field-error">{rangeError}</p>}
        </section>

        <section className="card ae-results">
          <header className="ae-results-head">
            <span>
              <strong>{rows.length}</strong> {rows.length === 1 ? 'expense' : 'expenses'}
            </span>
            <span>
              Total <strong>{formatAmount(total)}</strong>
            </span>
          </header>

          {loadError ? (
            <div className="empty empty-error">{loadError}</div>
          ) : loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">{filtersActive ? 'No expenses match these filters.' : 'No expenses yet.'}</div>
          ) : (
            <div className="ae-table-wrap">
              <table className="table ae-table">
                <thead>
                  <tr>
                    <th aria-sort={sort.startsWith('date') ? (sort.endsWith('asc') ? 'ascending' : 'descending') : 'none'}>
                      <button className="th-sort" onClick={() => sortBy('date')}>
                        Date <span className="th-arrow">{arrow('date')}</span>
                      </button>
                    </th>
                    <th>Description</th>
                    <th>Category</th>
                    <th
                      className="num"
                      aria-sort={sort.startsWith('amount') ? (sort.endsWith('asc') ? 'ascending' : 'descending') : 'none'}
                    >
                      <button className="th-sort" onClick={() => sortBy('amount')}>
                        Amount <span className="th-arrow">{arrow('amount')}</span>
                      </button>
                    </th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, shown).map((e) => (
                    <tr key={e.id} className="ae-row">
                      <td className="muted ae-date">{formatDate(e.date)}</td>
                      <td className="desc">
                        {e.description}
                        {e.recurringExpenseId && <span className="ae-tag">Recurring</span>}
                      </td>
                      <td>
                        <CategoryChip category={e.category} />
                      </td>
                      <td className="num ae-amount">{formatAmount(e.amount)}</td>
                      <td className="row-actions">
                        {confirmId === e.id ? (
                          <span className="confirm">
                            <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>
                              Delete
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => setConfirmId(e.id)}
                            aria-label={`Delete ${e.description}`}
                          >
                            <IconTrash width={15} height={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > shown && (
            <div className="ae-more">
              <button className="btn btn-ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                <IconChevronDown width={14} height={14} /> Show more ({rows.length - shown} left)
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
