import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api.js';
import { categoryColor, todayIso } from '../utils.js';
import { warnIfOverBudget } from '../budget.js';
import { IconChevronDown, IconX } from './Icons.jsx';

const emptyForm = (categoryId = '') => ({ amount: '', description: '', date: todayIso(), categoryId });

function dateLabel(iso) {
  if (!iso) return 'Date';
  if (iso === todayIso()) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// One-line form above the list: add an expense, or edit the one selected in the list.
export default function QuickAddBar({ categories, editing, onSaved, onCancelEdit, notify }) {
  const [form, setForm] = useState(() => emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const dateRef = useRef(null);

  // Default to the first category once categories have loaded
  useEffect(() => {
    if (!editing && !form.categoryId && categories.length) {
      setForm((f) => ({ ...f, categoryId: String(categories[0].id) }));
    }
  }, [categories, editing, form.categoryId]);

  useEffect(() => {
    setErrors({});
    if (editing) {
      setForm({
        amount: String(editing.amount),
        description: editing.description,
        date: editing.date,
        categoryId: String(editing.category.id),
      });
      amountRef.current?.focus();
    } else {
      setForm((f) => emptyForm(f.categoryId));
    }
  }, [editing]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  function openDatePicker() {
    const input = dateRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const body = {
      amount: form.amount === '' ? null : form.amount,
      description: form.description,
      date: form.date || null,
      categoryId: form.categoryId === '' ? null : Number(form.categoryId),
    };

    try {
      if (editing) {
        await api.updateExpense(editing.id, body);
        notify('success', 'Expense updated');
      } else {
        await api.createExpense(body);
        notify('success', 'Expense added');
        setForm((f) => ({ ...emptyForm(f.categoryId), date: f.date }));
        amountRef.current?.focus();
      }
      onSaved(body.date);
      warnIfOverBudget(body.categoryId, body.date, notify);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
      } else {
        notify('error', err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const firstError = errors.amount || errors.description || errors.categoryId || errors.date;

  return (
    <form className={`quick-add ${editing ? 'is-editing' : ''}`} onSubmit={submit} noValidate>
      <div className="quick-add-row">
        <label className={`qa-field qa-amount ${errors.amount ? 'has-error' : ''}`}>
          <span className="qa-prefix">₹</span>
          <input
            ref={amountRef}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0"
            aria-label="Amount"
            value={form.amount}
            onChange={set('amount')}
          />
        </label>

        <label className={`qa-field qa-desc ${errors.description ? 'has-error' : ''}`}>
          <input
            type="text"
            maxLength={255}
            placeholder="What did you spend on?"
            aria-label="Description"
            value={form.description}
            onChange={set('description')}
          />
        </label>

        <label
          className={`qa-field qa-select ${errors.categoryId ? 'has-error' : ''}`}
          style={{ '--chip': form.categoryId ? categoryColor(form.categoryId) : 'var(--ink-3)' }}
        >
          <span className="qa-dot" />
          <select value={form.categoryId} onChange={set('categoryId')} aria-label="Category">
            {!form.categoryId && <option value="">Category</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <IconChevronDown width={14} height={14} />
        </label>

        <button
          type="button"
          className={`qa-field qa-date ${errors.date ? 'has-error' : ''}`}
          onClick={openDatePicker}
          aria-label={`Date: ${dateLabel(form.date)}. Change date`}
        >
          {dateLabel(form.date)}
          <input
            ref={dateRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            max={todayIso()}
            value={form.date}
            onChange={set('date')}
          />
        </button>

        <button type="submit" className="btn btn-primary qa-submit" disabled={saving}>
          {saving ? '…' : editing ? 'Save' : 'Add'}
        </button>
        {editing && (
          <button type="button" className="icon-btn qa-cancel" onClick={onCancelEdit} aria-label="Cancel editing">
            <IconX width={16} height={16} />
          </button>
        )}
      </div>
      {firstError && <p className="field-error qa-error">{firstError}</p>}
    </form>
  );
}
