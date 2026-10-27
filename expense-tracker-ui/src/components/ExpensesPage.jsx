import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatDate, formatMoney } from '../utils.js';
import Frame from './Frame.jsx';
import CategoryChip from './CategoryChip.jsx';
import ExpenseInspector from './ExpenseInspector.jsx';
import { IconEdit, IconTrash, IconX } from './Icons.jsx';

const noFilters = { from: '', to: '', categoryId: '' };

export default function ExpensesPage({ categories, notify }) {
  const [filters, setFilters] = useState(noFilters);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setExpenses(await api.listExpenses(filters));
    } catch (err) {
      setLoadError(err.message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const filtersActive = filters.from || filters.to || filters.categoryId;

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  async function remove(id) {
    try {
      await api.deleteExpense(id);
      notify('success', 'Expense deleted');
      if (editing?.id === id) setEditing(null);
      setConfirmId(null);
      load();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="workspace">
      <div className="canvas">
        <div className="canvas-inner">
          <Frame
            label="Filters"
            className="frame-filters"
          >
            <div className="filters">
              <label className="filter">
                <span>From</span>
                <input type="date" value={filters.from} onChange={setFilter('from')} />
              </label>
              <label className="filter">
                <span>To</span>
                <input type="date" value={filters.to} onChange={setFilter('to')} />
              </label>
              <label className="filter filter-wide">
                <span>Category</span>
                <select value={filters.categoryId} onChange={setFilter('categoryId')}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {filtersActive && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFilters(noFilters)}>
                  <IconX width={14} height={14} /> Clear
                </button>
              )}
            </div>
          </Frame>

          <Frame
            label="Expenses"
            meta={`${expenses.length} ${expenses.length === 1 ? 'item' : 'items'}`}
            actions={<span className="frame-total">{formatMoney(total)}</span>}
          >
            {loadError ? (
              <div className="empty empty-error">{loadError}</div>
            ) : loading ? (
              <div className="empty">Loading…</div>
            ) : expenses.length === 0 ? (
              <div className="empty">
                {filtersActive
                  ? 'No expenses match these filters.'
                  : 'No expenses yet. Add your first one in the panel on the right.'}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th className="num">Amount</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr
                        key={e.id}
                        className={editing?.id === e.id ? 'is-selected' : ''}
                        onClick={() => setEditing(e)}
                      >
                        <td className="muted mono">{formatDate(e.date)}</td>
                        <td className="desc">{e.description}</td>
                        <td>
                          <CategoryChip category={e.category} />
                        </td>
                        <td className="num mono strong">{formatMoney(e.amount)}</td>
                        <td className="row-actions" onClick={(ev) => ev.stopPropagation()}>
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
                            <>
                              <button className="icon-btn" onClick={() => setEditing(e)} aria-label="Edit">
                                <IconEdit />
                              </button>
                              <button
                                className="icon-btn icon-btn-danger"
                                onClick={() => setConfirmId(e.id)}
                                aria-label="Delete"
                              >
                                <IconTrash />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Frame>
        </div>
      </div>

      <ExpenseInspector
        categories={categories}
        editing={editing}
        notify={notify}
        onSaved={() => {
          setEditing(null);
          load();
        }}
        onCancelEdit={() => setEditing(null)}
      />
    </div>
  );
}
