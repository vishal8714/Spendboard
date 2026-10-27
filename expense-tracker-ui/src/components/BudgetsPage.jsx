import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { categoryColor, currentMonth, formatMoney, monthLabel, shiftMonth } from '../utils.js';
import Frame from './Frame.jsx';
import MonthlyBudgetEditor from './MonthlyBudgetEditor.jsx';
import { IconChevronLeft, IconChevronRight, IconEdit, IconTrash } from './Icons.jsx';

// How full the bar is: under 80% fine, 80–100% close, above 100% over
function budgetState(spent, budget) {
  if (spent > budget) return 'over';
  if (spent >= budget * 0.8) return 'close';
  return 'ok';
}

export default function BudgetsPage({ notify }) {
  const [month, setMonth] = useState(currentMonth);
  const [items, setItems] = useState([]);
  const [overallBudget, setOverallBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingOverall, setEditingOverall] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const overview = await api.budgets(month);
      setItems(overview.categories);
      setOverallBudget(overview.overallBudget);
    } catch (err) {
      setLoadError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const budgeted = items.filter((i) => i.budget != null);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent), 0); // all spending in the month
  const monthly = overallBudget != null ? Number(overallBudget) : null;
  const overCount = budgeted.filter((i) => Number(i.spent) > Number(i.budget)).length;

  async function remove(item) {
    try {
      await api.removeBudget(item.categoryId);
      notify('success', `Budget removed for ${item.categoryName}`);
      load();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="canvas">
      <div className="canvas-inner">
        <div className="month-bar">
          <button className="icon-btn icon-btn-lg" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            <IconChevronLeft />
          </button>
          <h1 className="month-title">{monthLabel(month)}</h1>
          <button className="icon-btn icon-btn-lg" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            <IconChevronRight />
          </button>
          <input
            className="month-input"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </div>

        <div className="stat-row">
          <Frame label="Monthly budget" className="frame-stat">
            {editingOverall ? (
              <MonthlyBudgetEditor
                current={overallBudget}
                notify={notify}
                onCancel={() => setEditingOverall(false)}
                onSaved={() => {
                  setEditingOverall(false);
                  load();
                }}
              />
            ) : (
              <>
                <div className="stat-value">{loading ? '…' : monthly != null ? formatMoney(monthly) : '—'}</div>
                <button className="link-btn stat-link" onClick={() => setEditingOverall(true)}>
                  {monthly != null ? 'Edit' : '+ Set monthly budget'}
                </button>
              </>
            )}
          </Frame>
          <Frame label="Spent this month" className="frame-stat">
            <div className="stat-value">{loading ? '…' : formatMoney(totalSpent)}</div>
            {!loading && monthly != null && (
              <div className={`stat-sub ${totalSpent > monthly ? 'text-danger' : ''}`}>
                {totalSpent > monthly
                  ? `${formatMoney(totalSpent - monthly)} over the monthly budget`
                  : `${formatMoney(monthly - totalSpent)} left · ${Math.round((totalSpent / monthly) * 100)}% used`}
              </div>
            )}
          </Frame>
          <Frame label="Categories over budget" className="frame-stat">
            <div className={`stat-value ${overCount ? 'text-danger' : ''}`}>{loading ? '…' : overCount}</div>
            {!loading && <div className="stat-sub">{overCount === 1 ? 'category' : 'categories'}</div>}
          </Frame>
        </div>

        <Frame label="Budgets by category" meta="each applies every month">
          {loadError ? (
            <div className="empty empty-error">{loadError}</div>
          ) : loading ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">No categories yet. Add some on the Categories page first.</div>
          ) : (
            <ul className="budget-list">
              {items.map((item) =>
                editingId === item.categoryId ? (
                  <BudgetEditor
                    key={item.categoryId}
                    item={item}
                    notify={notify}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                  />
                ) : (
                  <BudgetRow
                    key={item.categoryId}
                    item={item}
                    onEdit={() => setEditingId(item.categoryId)}
                    onRemove={() => remove(item)}
                  />
                )
              )}
            </ul>
          )}
        </Frame>
      </div>
    </div>
  );
}

function BudgetRow({ item, onEdit, onRemove }) {
  const spent = Number(item.spent);
  const color = categoryColor(item.categoryId);

  if (item.budget == null) {
    return (
      <li className="budget-row" style={{ '--chip': color }}>
        <div className="bar-head">
          <span className="bar-name">
            <span className="chip-dot" />
            {item.categoryName}
          </span>
          <span className="bar-figures">
            <span className="muted mono">{formatMoney(spent)} spent</span>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              Set budget
            </button>
          </span>
        </div>
      </li>
    );
  }

  const budget = Number(item.budget);
  const state = budgetState(spent, budget);
  const pct = budget ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <li className={`budget-row budget-${state}`} style={{ '--chip': color }}>
      <div className="bar-head">
        <span className="bar-name">
          <span className="chip-dot" />
          {item.categoryName}
          {state === 'over' && <span className="budget-flag">Over budget</span>}
        </span>
        <span className="bar-figures">
          <span className="mono">
            <span className="strong">{formatMoney(spent)}</span>
            <span className="muted"> / {formatMoney(budget)}</span>
          </span>
          <span className="budget-actions">
            <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${item.categoryName} budget`}>
              <IconEdit width={14} height={14} />
            </button>
            <button
              className="icon-btn icon-btn-danger"
              onClick={onRemove}
              aria-label={`Remove ${item.categoryName} budget`}
            >
              <IconTrash width={14} height={14} />
            </button>
          </span>
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill budget-fill" style={{ width: `${Math.max(pct, 0.5)}%` }} />
      </div>
      <div className="budget-note">
        {state === 'over'
          ? `${formatMoney(spent - budget)} over budget`
          : `${formatMoney(budget - spent)} left · ${Math.round((spent / budget) * 100)}% used`}
      </div>
    </li>
  );
}

function BudgetEditor({ item, notify, onCancel, onSaved }) {
  const [amount, setAmount] = useState(item.budget != null ? String(item.budget) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.setBudget(item.categoryId, amount === '' ? null : amount);
      notify('success', `Budget for ${item.categoryName} saved`);
      onSaved();
    } catch (err) {
      setError(err.fieldErrors?.amount || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="budget-row" style={{ '--chip': categoryColor(item.categoryId) }}>
      <form className="budget-editor" onSubmit={submit} noValidate>
        <span className="bar-name">
          <span className="chip-dot" />
          {item.categoryName}
        </span>
        <label className={`field field-sm budget-input ${error ? 'has-error' : ''}`}>
          <span className="field-prefix">₹</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="Monthly budget"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Escape' && onCancel()}
            autoFocus
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {error && <p className="field-error budget-error">{error}</p>}
      </form>
    </li>
  );
}
