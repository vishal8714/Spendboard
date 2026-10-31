import { useEffect, useState } from 'react';
import { api, ApiError } from '../api.js';
import { todayIso } from '../utils.js';
import { IconX } from './Icons.jsx';

export const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const emptyForm = () => ({
  amount: '',
  description: '',
  categoryId: '',
  frequency: 'MONTHLY',
  startDate: todayIso(),
  endDate: '',
});

// Right-hand panel of the Recurring page: add a rule, or edit the selected one.
// Frequency and start date are fixed once created (the schedule is counted from them).
export default function RecurringInspector({ categories, editing, onSaved, onCancelEdit, notify }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setErrors({});
    setFormError('');
    if (editing) {
      setForm({
        amount: String(editing.amount),
        description: editing.description,
        categoryId: String(editing.category.id),
        frequency: editing.frequency,
        startDate: editing.startDate,
        endDate: editing.endDate || '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [editing]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');

    const body = {
      amount: form.amount === '' ? null : form.amount,
      description: form.description,
      categoryId: form.categoryId === '' ? null : Number(form.categoryId),
      frequency: form.frequency || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    try {
      if (editing) {
        await api.updateRecurring(editing.id, body);
        notify('success', 'Recurring expense updated');
      } else {
        await api.createRecurring(body);
        notify(
          'success',
          form.startDate <= todayIso()
            ? 'Recurring expense added. Expenses due up to today were added to your list.'
            : 'Recurring expense added'
        );
        setForm(emptyForm());
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="inspector">
      <div className="panel-title">
        <span>{editing ? 'Edit recurring expense' : 'New recurring expense'}</span>
        {editing && (
          <button className="icon-btn" onClick={onCancelEdit} aria-label="Cancel editing">
            <IconX />
          </button>
        )}
      </div>

      <form className="inspector-form" onSubmit={submit} noValidate>
        <div className="prop-group">
          <div className="prop-heading">Amount</div>
          <label className={`field ${errors.amount ? 'has-error' : ''}`}>
            <span className="field-prefix">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={set('amount')}
            />
          </label>
          {errors.amount && <p className="field-error">{errors.amount}</p>}
        </div>

        <div className="prop-group">
          <div className="prop-heading">Description</div>
          <label className={`field ${errors.description ? 'has-error' : ''}`}>
            <input
              type="text"
              maxLength={255}
              placeholder="e.g. Rent, Netflix, Gym"
              value={form.description}
              onChange={set('description')}
            />
          </label>
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <div className="prop-group">
          <div className="prop-heading">Category</div>
          <label className={`field ${errors.categoryId ? 'has-error' : ''}`}>
            <select value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
        </div>

        <div className="prop-group">
          <div className="prop-heading">Repeats</div>
          <label className={`field ${errors.frequency ? 'has-error' : ''} ${editing ? 'field-readonly' : ''}`}>
            <select value={form.frequency} onChange={set('frequency')} disabled={!!editing}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          {errors.frequency && <p className="field-error">{errors.frequency}</p>}
        </div>

        <div className="prop-group">
          <div className="prop-heading">Starts on</div>
          <label className={`field ${errors.startDate ? 'has-error' : ''} ${editing ? 'field-readonly' : ''}`}>
            <input type="date" value={form.startDate} onChange={set('startDate')} disabled={!!editing} />
          </label>
          {errors.startDate ? (
            <p className="field-error">{errors.startDate}</p>
          ) : editing ? (
            <p className="field-hint">To change how often or the start date, delete this and add a new one.</p>
          ) : (
            <p className="field-hint">A past date adds the expenses due up to today (up to one year back).</p>
          )}
        </div>

        <div className="prop-group">
          <div className="prop-heading">Ends on (optional)</div>
          <label className={`field ${errors.endDate ? 'has-error' : ''}`}>
            <input type="date" min={form.startDate} value={form.endDate} onChange={set('endDate')} />
          </label>
          {errors.endDate ? (
            <p className="field-error">{errors.endDate}</p>
          ) : (
            <p className="field-hint">Leave empty to repeat until you pause or delete it.</p>
          )}
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div className="inspector-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add recurring expense'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
