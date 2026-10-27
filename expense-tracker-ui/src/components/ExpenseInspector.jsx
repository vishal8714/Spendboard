import { useEffect, useState } from 'react';
import { api, ApiError } from '../api.js';
import { todayIso } from '../utils.js';
import { IconX } from './Icons.jsx';

const emptyForm = () => ({
  amount: '',
  description: '',
  date: todayIso(),
  categoryId: '',
});

export default function ExpenseInspector({ categories, editing, onSaved, onCancelEdit, notify }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the selected expense into the form, or reset for "new"
  useEffect(() => {
    setErrors({});
    setFormError('');
    if (editing) {
      setForm({
        amount: String(editing.amount),
        description: editing.description,
        date: editing.date,
        categoryId: String(editing.category.id),
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

    // Send exactly what ExpenseRequest expects. Empty values become null,
    // so the backend's validation produces its field messages.
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
        setForm((f) => ({ ...emptyForm(), date: f.date, categoryId: f.categoryId }));
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
        <span>{editing ? `Edit expense #${editing.id}` : 'New expense'}</span>
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
              placeholder="e.g. Lunch with team"
              value={form.description}
              onChange={set('description')}
            />
          </label>
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <div className="prop-row">
          <div className="prop-group">
            <div className="prop-heading">Date</div>
            <label className={`field ${errors.date ? 'has-error' : ''}`}>
              <input type="date" max={todayIso()} value={form.date} onChange={set('date')} />
            </label>
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>
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

        {formError && <p className="form-error">{formError}</p>}

        <div className="inspector-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
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
