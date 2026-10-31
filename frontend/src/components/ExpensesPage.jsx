import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  categoryColor,
  currentMonth,
  dayHeading,
  daysInMonth,
  formatAmount,
  monthLabel,
  monthRange,
  shiftMonth,
  todayIso,
} from '../utils.js';
import CategoryIcon from './CategoryIcon.jsx';
import QuickAddBar from './QuickAddBar.jsx';
import MonthlyBudgetEditor from './MonthlyBudgetEditor.jsx';
import {
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconFilter,
  IconSearch,
  IconTrash,
} from './Icons.jsx';

// under 80% fine, 80–100% close, over 100% over
const budgetState = (spent, budget) => (spent > budget ? 'over' : spent >= budget * 0.8 ? 'close' : 'ok');

export default function ExpensesPage({ categories, notify, onNavigate }) {
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]); // per-category
  const [overallBudget, setOverallBudget] = useState(null); // all spending in the month
  const [editingBudget, setEditingBudget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [list, overview] = await Promise.all([
        api.listExpenses(monthRange(month)),
        api.budgets(month).catch(() => ({ overallBudget: null, categories: [] })), // extra; never block the list
      ]);
      setExpenses(list);
      setBudgets(overview.categories);
      setOverallBudget(overview.overallBudget);
    } catch (err) {
      setLoadError(err.message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- month figures (always for the whole month, not the search/filter) ----
  const stats = useMemo(() => {
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const budget = overallBudget != null ? Number(overallBudget) : 0;

    const today = todayIso();
    const thisMonth = currentMonth();
    const total = daysInMonth(month);
    const daysPassed = month === thisMonth ? Number(today.slice(8)) : month < thisMonth ? total : 0;

    const byCategory = new Map();
    expenses.forEach((e) => {
      const cur = byCategory.get(e.category.id) ?? { category: e.category, spent: 0 };
      cur.spent += Number(e.amount);
      byCategory.set(e.category.id, cur);
    });
    const ranked = [...byCategory.values()].sort((a, b) => b.spent - a.spent);

    return {
      spent,
      budget,
      daysLeft: month === thisMonth ? total - daysPassed : null,
      dailyAverage: daysPassed ? spent / daysPassed : null,
      count: expenses.length,
      top: ranked[0]?.category.name,
      ranked,
    };
  }, [expenses, overallBudget, month]);

  // ---- list (search + category filter applied) ----
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = expenses.filter(
      (e) =>
        (!categoryFilter || String(e.category.id) === categoryFilter) &&
        (!q || e.description.toLowerCase().includes(q) || e.category.name.toLowerCase().includes(q))
    );
    const map = new Map();
    visible.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return [...map.entries()].map(([date, items]) => ({
      date,
      items,
      total: items.reduce((s, e) => s + Number(e.amount), 0),
    }));
  }, [expenses, search, categoryFilter]);

  const budgetFor = (categoryId) => budgets.find((b) => b.categoryId === categoryId)?.budget;

  // Categories at 80% of their budget or more, worst first
  const alerts = useMemo(
    () =>
      budgets
        .filter((b) => b.budget != null && Number(b.spent) >= Number(b.budget) * 0.8)
        .map((b) => ({ ...b, pct: (Number(b.spent) / Number(b.budget)) * 100 }))
        .sort((a, b) => b.pct - a.pct),
    [budgets]
  );

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

  const filtersActive = !!categoryFilter;
  const heroState = stats.budget ? budgetState(stats.spent, stats.budget) : 'ok';
  const heroPct = stats.budget ? Math.min((stats.spent / stats.budget) * 100, 100) : 0;

  return (
    <div className="page">
      <div className="page-inner">
        {/* ---- header ---- */}
        <div className="page-head">
          <div className="month-nav">
            <button className="nav-arrow" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
              <IconChevronLeft width={16} height={16} />
            </button>
            <h1 className="page-title">{monthLabel(month)}</h1>
            <button
              className="nav-arrow"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Next month"
              disabled={month >= currentMonth()}
            >
              <IconChevronRight width={16} height={16} />
            </button>
          </div>

          <div className="page-tools">
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
            <button
              className={`tool-btn ${showFilters || filtersActive ? 'is-active' : ''}`}
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
            >
              <IconFilter width={16} height={16} />
              Filters
              {filtersActive && <span className="tool-badge">1</span>}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-bar">
            <label className="filter-inline">
              <span>Category</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {filtersActive && (
              <button className="link-btn" onClick={() => setCategoryFilter('')}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ---- month summary ---- */}
        <section className="card hero">
          <div className="hero-main">
            <div className="hero-label">Spent this month</div>
            <div className="hero-figure">
              <span className="hero-amount">{loading ? '…' : formatAmount(stats.spent)}</span>
              {!editingBudget &&
                (stats.budget > 0 ? (
                  <span className="hero-of">
                    of {formatAmount(stats.budget)} monthly budget
                    <button
                      className="icon-btn hero-edit"
                      onClick={() => setEditingBudget(true)}
                      aria-label="Edit monthly budget"
                      title="Edit monthly budget"
                    >
                      <IconEdit width={14} height={14} />
                    </button>
                  </span>
                ) : (
                  <button className="link-btn hero-of" onClick={() => setEditingBudget(true)}>
                    + Set monthly budget
                  </button>
                ))}
            </div>
            {editingBudget && (
              <MonthlyBudgetEditor
                current={overallBudget}
                notify={notify}
                onCancel={() => setEditingBudget(false)}
                onSaved={() => {
                  setEditingBudget(false);
                  load();
                }}
              />
            )}
            {!editingBudget && stats.budget > 0 && (
              <>
                <div className={`hero-track hero-${heroState}`}>
                  <div className="hero-fill" style={{ width: `${Math.max(heroPct, 1)}%` }} />
                </div>
                <div className={`hero-note hero-${heroState}`}>
                  {stats.spent > stats.budget
                    ? `${formatAmount(stats.spent - stats.budget)} over budget`
                    : `${formatAmount(stats.budget - stats.spent)} left · ${Math.round((stats.spent / stats.budget) * 100)}% used`}
                  {stats.daysLeft != null &&
                    ` · ${stats.daysLeft === 0 ? 'last day' : `${stats.daysLeft} ${stats.daysLeft === 1 ? 'day' : 'days'} to go`}`}
                </div>
              </>
            )}
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-label">Daily average</div>
              <div className="hero-stat-value">
                {stats.dailyAverage == null ? '—' : formatAmount(Math.round(stats.dailyAverage))}
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Transactions</div>
              <div className="hero-stat-value">{stats.count}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Top category</div>
              <div className="hero-stat-value hero-stat-text">{stats.top ?? '—'}</div>
            </div>
          </div>
        </section>

        <div className="split">
          {/* ---- add + list ---- */}
          <div className="split-main">
            <div className="card quick-add-card">
              <QuickAddBar
                categories={categories}
                editing={editing}
                notify={notify}
                onSaved={(date) => {
                  setEditing(null);
                  const savedMonth = date?.slice(0, 7);
                  if (savedMonth && savedMonth !== month) setMonth(savedMonth); // jump to where it went
                  else load();
                }}
                onCancelEdit={() => setEditing(null)}
              />
            </div>

            <div className="card list-card">
              {loadError ? (
                <div className="empty empty-error">{loadError}</div>
              ) : loading ? (
                <div className="empty">Loading…</div>
              ) : groups.length === 0 ? (
                <div className="empty">
                  {expenses.length === 0
                    ? `No expenses in ${monthLabel(month)} yet. Add one above.`
                    : 'No expenses match your search or filters.'}
                </div>
              ) : (
                groups.map((g) => (
                  <section key={g.date} className="day-group">
                    <header className="day-head">
                      <span>{dayHeading(g.date)}</span>
                      <span>{formatAmount(g.total)}</span>
                    </header>
                    <ul className="tx-list">
                      {g.items.map((e) => (
                        <li
                          key={e.id}
                          className={`tx ${editing?.id === e.id ? 'is-selected' : ''}`}
                          onClick={() => setEditing(e)}
                        >
                          <CategoryIcon category={e.category} />
                          <div className="tx-text">
                            <div className="tx-title">{e.description}</div>
                            <div className="tx-sub">
                              {e.category.name}
                              {e.recurringExpenseId && ' · Recurring'}
                            </div>
                          </div>
                          <div className="tx-amount">{formatAmount(e.amount)}</div>
                          <div className="tx-actions" onClick={(ev) => ev.stopPropagation()}>
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
                                  <IconEdit width={15} height={15} />
                                </button>
                                <button
                                  className="icon-btn icon-btn-danger"
                                  onClick={() => setConfirmId(e.id)}
                                  aria-label="Delete"
                                >
                                  <IconTrash width={15} height={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>

          {/* ---- by category ---- */}
          <aside className="card side-card">
            <div className="side-head">
              <h2 className="side-title">By category</h2>
              <button className="link-btn" onClick={() => onNavigate('summary')}>
                See all
              </button>
            </div>

            {stats.ranked.length === 0 ? (
              <div className="empty side-empty">Nothing spent yet this month.</div>
            ) : (
              <ul className="cat-bars">
                {stats.ranked.slice(0, 5).map(({ category, spent }) => {
                  const budget = budgetFor(category.id);
                  // With a budget the bar shows how much of it is used; without, size relative to the biggest
                  const pct = budget != null ? (spent / Number(budget)) * 100 : (spent / stats.ranked[0].spent) * 100;
                  return (
                    <li key={category.id} className="cat-bar" style={{ '--chip': categoryColor(category.id) }}>
                      <div className="cat-bar-head">
                        <span>{category.name}</span>
                        <span className="cat-bar-amount">{formatAmount(spent)}</span>
                      </div>
                      <div className="cat-bar-track" title={budget != null ? `Budget ${formatAmount(budget)}` : undefined}>
                        <div className="cat-bar-fill" style={{ width: `${Math.min(Math.max(pct, 3), 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {alerts.length > 0 && (
              <div className="side-alerts">
                {alerts.map((a) => (
                  <div key={a.categoryId} className={`alert ${a.pct > 100 ? 'alert-over' : ''}`}>
                    <IconAlertCircle width={16} height={16} />
                    <span>
                      {a.pct > 100
                        ? `${a.categoryName} is over its ${formatAmount(a.budget)} budget by ${formatAmount(
                            Number(a.spent) - Number(a.budget)
                          )}.`
                        : `${a.categoryName} is at ${Math.round(a.pct)}% of its ${formatAmount(a.budget)} budget.`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
